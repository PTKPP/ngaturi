package auth

import (
	"context"
	"errors"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type synchronizedRepository struct {
	base *memoryRepository
	mu   sync.Mutex
}

func newSynchronizedRepository() *synchronizedRepository {
	return &synchronizedRepository{base: newMemoryRepository()}
}

func (r *synchronizedRepository) CreateUser(ctx context.Context, email, hash string) (User, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.base.CreateUser(ctx, email, hash)
}

func (r *synchronizedRepository) FindUserByEmail(ctx context.Context, email string) (User, string, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.base.FindUserByEmail(ctx, email)
}

func (r *synchronizedRepository) CreateSession(ctx context.Context, userID uuid.UUID, hash []byte, expires time.Time) (Session, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.base.CreateSession(ctx, userID, hash, expires)
}

func (r *synchronizedRepository) RotateSession(ctx context.Context, oldHash, newHash []byte, expires, now time.Time) (Session, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.base.RotateSession(ctx, oldHash, newHash, expires, now)
}

func (r *synchronizedRepository) RevokeSession(ctx context.Context, userID, sessionID uuid.UUID, now time.Time) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.base.RevokeSession(ctx, userID, sessionID, now)
}

func newTestService(repo Repository) *Service {
	service := NewService(repo, NewTokenManager([]byte("01234567890123456789012345678901"), time.Minute, time.Hour))
	now := time.Now().UTC()
	service.now = func() time.Time { return now }
	return service
}

func TestRegisterRejectsDuplicateNormalizedEmailAndHashesPassword(t *testing.T) {
	repo := newMemoryRepository()
	service := newTestService(repo)
	password := "a-secure-password"
	if _, err := service.Register(context.Background(), "Owner@example.com", password); err != nil {
		t.Fatalf("Register() error = %v", err)
	}
	if repo.passwordHash == password || bcrypt.CompareHashAndPassword([]byte(repo.passwordHash), []byte(password)) != nil {
		t.Fatal("password was not stored as a bcrypt hash")
	}
	if _, err := service.Register(context.Background(), " owner@EXAMPLE.com ", password); !errors.Is(err, ErrEmailTaken) {
		t.Fatalf("duplicate register error = %v, want ErrEmailTaken", err)
	}
}

func TestLoginRejectsWrongPasswordAndUnknownEmail(t *testing.T) {
	service := newTestService(newMemoryRepository())
	if _, err := service.Register(context.Background(), "owner@example.com", "a-secure-password"); err != nil {
		t.Fatal(err)
	}
	for _, request := range []struct{ email, password string }{
		{"owner@example.com", "wrong-password"},
		{"missing@example.com", "a-secure-password"},
	} {
		if _, err := service.Login(context.Background(), request.email, request.password); !errors.Is(err, ErrInvalidCredentials) {
			t.Fatalf("Login(%q) error = %v, want ErrInvalidCredentials", request.email, err)
		}
	}
}

func TestRefreshRejectsExpiredAndRevokedSessions(t *testing.T) {
	repo := newMemoryRepository()
	service := newTestService(repo)
	createdAt := service.now()
	pair, err := service.Register(context.Background(), "owner@example.com", "a-secure-password")
	if err != nil {
		t.Fatal(err)
	}
	service.now = func() time.Time { return createdAt.Add(2 * time.Hour) }
	if _, err := service.Refresh(context.Background(), pair.RefreshToken); !errors.Is(err, ErrInvalidSession) {
		t.Fatalf("expired refresh error = %v, want ErrInvalidSession", err)
	}

	repo = newMemoryRepository()
	service = newTestService(repo)
	pair, err = service.Register(context.Background(), "owner@example.com", "a-secure-password")
	if err != nil {
		t.Fatal(err)
	}
	claims, err := service.Tokens().Parse(pair.AccessToken)
	if err != nil {
		t.Fatal(err)
	}
	if err := service.Logout(context.Background(), claims); err != nil {
		t.Fatal(err)
	}
	if _, err := service.Refresh(context.Background(), pair.RefreshToken); !errors.Is(err, ErrInvalidSession) {
		t.Fatalf("revoked refresh error = %v, want ErrInvalidSession", err)
	}
}

func TestConcurrentRefreshConsumesTokenOnce(t *testing.T) {
	service := newTestService(newSynchronizedRepository())
	pair, err := service.Register(context.Background(), "owner@example.com", "a-secure-password")
	if err != nil {
		t.Fatal(err)
	}

	results := make(chan error, 2)
	start := make(chan struct{})
	for range 2 {
		go func() { <-start; _, err := service.Refresh(context.Background(), pair.RefreshToken); results <- err }()
	}
	close(start)
	var successes, failures int
	for range 2 {
		if err := <-results; err == nil {
			successes++
		} else if errors.Is(err, ErrInvalidSession) {
			failures++
		} else {
			t.Fatalf("Refresh() unexpected error = %v", err)
		}
	}
	if successes != 1 || failures != 1 {
		t.Fatalf("refresh results: successes=%d failures=%d, want 1 and 1", successes, failures)
	}
}

func TestTokenManagerRejectsMalformedAndExpiredAccessTokens(t *testing.T) {
	manager := NewTokenManager([]byte("01234567890123456789012345678901"), time.Minute, time.Hour)
	if _, err := manager.Parse("not-a-jwt"); !errors.Is(err, ErrInvalidSession) {
		t.Fatalf("malformed token error = %v, want ErrInvalidSession", err)
	}
	pair, err := manager.Pair(uuid.New(), uuid.New(), "refresh-token", time.Date(2000, 1, 1, 0, 0, 0, 0, time.UTC))
	if err != nil {
		t.Fatal(err)
	}
	if _, err := manager.Parse(pair.AccessToken); !errors.Is(err, ErrInvalidSession) {
		t.Fatalf("expired token error = %v, want ErrInvalidSession", err)
	}
}
