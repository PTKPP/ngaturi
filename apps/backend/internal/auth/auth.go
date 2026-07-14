package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrInvalidSession     = errors.New("invalid session")
	ErrEmailTaken         = errors.New("email already registered")
	ErrInvalidInput       = errors.New("invalid input")
)

type User struct { ID uuid.UUID; Email string }
type Session struct { ID, UserID uuid.UUID; ExpiresAt time.Time }
type TokenPair struct { AccessToken, RefreshToken string; ExpiresAt time.Time }

type Repository interface {
	CreateUser(context.Context, string, string) (User, error)
	FindUserByEmail(context.Context, string) (User, string, error)
	CreateSession(context.Context, uuid.UUID, []byte, time.Time) (Session, error)
	RotateSession(context.Context, []byte, []byte, time.Time, time.Time) (Session, error)
	RevokeSession(context.Context, uuid.UUID, uuid.UUID, time.Time) error
}

type Service struct { repo Repository; tokens *TokenManager; now func() time.Time }
func NewService(repo Repository, tokens *TokenManager) *Service { return &Service{repo: repo, tokens: tokens, now: time.Now} }
func (s *Service) Tokens() *TokenManager { return s.tokens }

func NormalizeEmail(email string) string { return strings.ToLower(strings.TrimSpace(email)) }

func (s *Service) Register(ctx context.Context, email, password string) (TokenPair, error) {
	email = NormalizeEmail(email)
	if !validEmail(email) || len(password) < 12 || len(password) > 128 { return TokenPair{}, ErrInvalidInput }
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil { return TokenPair{}, err }
	user, err := s.repo.CreateUser(ctx, email, string(hash))
	if err != nil { return TokenPair{}, err }
	return s.newSession(ctx, user.ID)
}

func (s *Service) Login(ctx context.Context, email, password string) (TokenPair, error) {
	email = NormalizeEmail(email)
	if !validEmail(email) || password == "" { return TokenPair{}, ErrInvalidInput }
	user, hash, err := s.repo.FindUserByEmail(ctx, email)
	if err != nil { return TokenPair{}, err }
	if bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) != nil { return TokenPair{}, ErrInvalidCredentials }
	return s.newSession(ctx, user.ID)
}

func (s *Service) Refresh(ctx context.Context, refreshToken string) (TokenPair, error) {
	if len(refreshToken) < 20 { return TokenPair{}, ErrInvalidInput }
	next, err := randomToken(); if err != nil { return TokenPair{}, err }
	now := s.now().UTC()
	session, err := s.repo.RotateSession(ctx, tokenHash(refreshToken), tokenHash(next), now.Add(s.tokens.RefreshTTL()), now)
	if err != nil { return TokenPair{}, err }
	return s.tokens.Pair(session.UserID, session.ID, next, now)
}

func (s *Service) Logout(ctx context.Context, claims Claims) error { return s.repo.RevokeSession(ctx, claims.UserID, claims.SessionID, s.now().UTC()) }

func (s *Service) newSession(ctx context.Context, userID uuid.UUID) (TokenPair, error) {
	refresh, err := randomToken(); if err != nil { return TokenPair{}, err }
	now := s.now().UTC()
	session, err := s.repo.CreateSession(ctx, userID, tokenHash(refresh), now.Add(s.tokens.RefreshTTL()))
	if err != nil { return TokenPair{}, err }
	return s.tokens.Pair(userID, session.ID, refresh, now)
}

func randomToken() (string, error) { b := make([]byte, 32); if _, err := rand.Read(b); err != nil { return "", err }; return base64.RawURLEncoding.EncodeToString(b), nil }
func tokenHash(token string) []byte { sum := sha256.Sum256([]byte(token)); return sum[:] }
func validEmail(email string) bool { return len(email) <= 254 && strings.Count(email, "@") == 1 && !strings.HasPrefix(email, "@") && !strings.HasSuffix(email, "@") }
