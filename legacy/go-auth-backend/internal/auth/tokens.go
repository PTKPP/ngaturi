package auth

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

type Claims struct{ UserID, SessionID uuid.UUID }
type jwtClaims struct {
	SessionID string `json:"sid"`
	jwt.RegisteredClaims
}
type TokenManager struct {
	secret                []byte
	accessTTL, refreshTTL time.Duration
}

func NewTokenManager(secret []byte, accessTTL, refreshTTL time.Duration) *TokenManager {
	return &TokenManager{secret: secret, accessTTL: accessTTL, refreshTTL: refreshTTL}
}
func (m *TokenManager) RefreshTTL() time.Duration { return m.refreshTTL }
func (m *TokenManager) Pair(userID, sessionID uuid.UUID, refresh string, now time.Time) (TokenPair, error) {
	expires := now.Add(m.accessTTL)
	claims := jwtClaims{SessionID: sessionID.String(), RegisteredClaims: jwt.RegisteredClaims{Subject: userID.String(), ExpiresAt: jwt.NewNumericDate(expires), IssuedAt: jwt.NewNumericDate(now)}}
	access, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(m.secret)
	if err != nil {
		return TokenPair{}, err
	}
	return TokenPair{AccessToken: access, RefreshToken: refresh, ExpiresAt: expires}, nil
}
func (m *TokenManager) Parse(access string) (Claims, error) {
	parsed, err := jwt.ParseWithClaims(access, &jwtClaims{}, func(token *jwt.Token) (interface{}, error) {
		if token.Method != jwt.SigningMethodHS256 {
			return nil, errors.New("unexpected signing method")
		}
		return m.secret, nil
	})
	if err != nil || !parsed.Valid {
		return Claims{}, ErrInvalidSession
	}
	claims, ok := parsed.Claims.(*jwtClaims)
	if !ok {
		return Claims{}, ErrInvalidSession
	}
	userID, err := uuid.Parse(claims.Subject)
	if err != nil {
		return Claims{}, ErrInvalidSession
	}
	sessionID, err := uuid.Parse(claims.SessionID)
	if err != nil {
		return Claims{}, ErrInvalidSession
	}
	return Claims{UserID: userID, SessionID: sessionID}, nil
}
