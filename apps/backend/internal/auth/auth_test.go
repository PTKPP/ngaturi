package auth

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
)

type memoryRepository struct {
	user         User
	passwordHash string
	sessions     map[string]Session
	revoked      map[uuid.UUID]bool
}

func newMemoryRepository() *memoryRepository {
	return &memoryRepository{sessions: map[string]Session{}, revoked: map[uuid.UUID]bool{}}
}
func (r *memoryRepository) CreateUser(_ context.Context, email, hash string) (User, error) {
	if r.user.ID != uuid.Nil {
		return User{}, ErrEmailTaken
	}
	r.user = User{ID: uuid.New(), Email: email}
	r.passwordHash = hash
	return r.user, nil
}
func (r *memoryRepository) FindUserByEmail(_ context.Context, email string) (User, string, error) {
	if email != r.user.Email {
		return User{}, "", ErrInvalidCredentials
	}
	return r.user, r.passwordHash, nil
}
func (r *memoryRepository) CreateSession(_ context.Context, userID uuid.UUID, hash []byte, expires time.Time) (Session, error) {
	s := Session{ID: uuid.New(), UserID: userID, ExpiresAt: expires}
	r.sessions[string(hash)] = s
	return s, nil
}
func (r *memoryRepository) RotateSession(_ context.Context, oldHash, newHash []byte, expires, now time.Time) (Session, error) {
	s, ok := r.sessions[string(oldHash)]
	if !ok || r.revoked[s.ID] || !s.ExpiresAt.After(now) {
		return Session{}, ErrInvalidSession
	}
	r.revoked[s.ID] = true
	return r.CreateSession(context.Background(), s.UserID, newHash, expires)
}
func (r *memoryRepository) RevokeSession(_ context.Context, userID, sessionID uuid.UUID, _ time.Time) error {
	for _, s := range r.sessions {
		if s.ID == sessionID && s.UserID == userID && !r.revoked[s.ID] {
			r.revoked[s.ID] = true
			return nil
		}
	}
	return ErrInvalidSession
}

func TestRegisterNormalizesEmailAndRefreshRotatesToken(t *testing.T) {
	repo := newMemoryRepository()
	service := NewService(repo, NewTokenManager([]byte("01234567890123456789012345678901"), time.Minute, time.Hour))
	service.now = func() time.Time { return time.Now().UTC() }
	pair, err := service.Register(context.Background(), " Owner@Example.COM ", "a-secure-password")
	if err != nil {
		t.Fatalf("Register() error = %v", err)
	}
	if repo.user.Email != "owner@example.com" {
		t.Fatalf("stored email = %q", repo.user.Email)
	}
	if _, err := service.tokens.Parse(pair.AccessToken); err != nil {
		t.Fatalf("Parse() error = %v", err)
	}
	rotated, err := service.Refresh(context.Background(), pair.RefreshToken)
	if err != nil {
		t.Fatalf("Refresh() error = %v", err)
	}
	if rotated.RefreshToken == pair.RefreshToken {
		t.Fatal("refresh token was not rotated")
	}
	if _, err := service.Refresh(context.Background(), pair.RefreshToken); !errors.Is(err, ErrInvalidSession) {
		t.Fatalf("old refresh error = %v, want ErrInvalidSession", err)
	}
}

func TestLogoutOnlyRevokesClaimedUsersSession(t *testing.T) {
	repo := newMemoryRepository()
	service := NewService(repo, NewTokenManager([]byte("01234567890123456789012345678901"), time.Minute, time.Hour))
	pair, err := service.Register(context.Background(), "owner@example.com", "a-secure-password")
	if err != nil {
		t.Fatal(err)
	}
	claims, err := service.tokens.Parse(pair.AccessToken)
	if err != nil {
		t.Fatal(err)
	}
	if err := service.Logout(context.Background(), claims); err != nil {
		t.Fatalf("Logout() error = %v", err)
	}
	if err := service.Logout(context.Background(), Claims{UserID: uuid.New(), SessionID: claims.SessionID}); !errors.Is(err, ErrInvalidSession) {
		t.Fatalf("foreign logout error = %v", err)
	}
}
