package httpapi

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/okee/ngaturi/internal/auth"
)

type API struct{ auth *auth.Service }

func NewRouter(service *auth.Service) http.Handler {
	a := &API{auth: service}
	r := chi.NewRouter()
	r.Use(requestID)
	r.Post("/api/v1/auth/register", a.register)
	r.Post("/api/v1/auth/login", a.login)
	r.Post("/api/v1/auth/refresh", a.refresh)
	r.With(a.requireAuth).Post("/api/v1/auth/logout", a.logout)
	return r
}

type credentialsRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}
type refreshRequest struct {
	RefreshToken string `json:"refresh_token"`
}
type response struct {
	Success bool `json:"success"`
	Data    any  `json:"data"`
}
type errorResponse struct {
	Success bool     `json:"success"`
	Error   apiError `json:"error"`
}
type apiError struct {
	Code      string `json:"code"`
	Message   string `json:"message"`
	Details   any    `json:"details"`
	RequestID string `json:"request_id"`
}
type authData struct {
	AccessToken  string    `json:"access_token"`
	RefreshToken string    `json:"refresh_token"`
	TokenType    string    `json:"token_type"`
	ExpiresAt    time.Time `json:"expires_at"`
}

func (a *API) register(w http.ResponseWriter, r *http.Request) {
	var request credentialsRequest
	if !decode(w, r, &request) {
		return
	}
	pair, err := a.auth.Register(r.Context(), request.Email, request.Password)
	a.writeAuth(w, r, pair, err, http.StatusCreated)
}
func (a *API) login(w http.ResponseWriter, r *http.Request) {
	var request credentialsRequest
	if !decode(w, r, &request) {
		return
	}
	pair, err := a.auth.Login(r.Context(), request.Email, request.Password)
	a.writeAuth(w, r, pair, err, http.StatusOK)
}
func (a *API) refresh(w http.ResponseWriter, r *http.Request) {
	var request refreshRequest
	if !decode(w, r, &request) {
		return
	}
	pair, err := a.auth.Refresh(r.Context(), request.RefreshToken)
	a.writeAuth(w, r, pair, err, http.StatusOK)
}
func (a *API) logout(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r)
	if err := a.auth.Logout(r.Context(), claims); err != nil {
		writeError(w, r, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required or invalid")
		return
	}
	writeJSON(w, http.StatusOK, response{Success: true, Data: struct{}{}})
}

func (a *API) writeAuth(w http.ResponseWriter, r *http.Request, pair auth.TokenPair, err error, successStatus int) {
	if err == nil {
		writeJSON(w, successStatus, response{Success: true, Data: authData{pair.AccessToken, pair.RefreshToken, "Bearer", pair.ExpiresAt}})
		return
	}
	switch {
	case errors.Is(err, auth.ErrInvalidInput):
		writeError(w, r, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid request")
	case errors.Is(err, auth.ErrEmailTaken):
		writeError(w, r, http.StatusConflict, "CONFLICT", "Email already registered")
	case errors.Is(err, auth.ErrInvalidCredentials), errors.Is(err, auth.ErrInvalidSession):
		writeError(w, r, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required or invalid")
	default:
		writeError(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
	}
}

type contextKey string

const claimsKey contextKey = "auth_claims"

func (a *API) requireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		header := r.Header.Get("Authorization")
		const prefix = "Bearer "
		if !strings.HasPrefix(header, prefix) {
			writeError(w, r, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required or invalid")
			return
		}
		claims, err := a.authTokenManager().Parse(strings.TrimPrefix(header, prefix))
		if err != nil {
			writeError(w, r, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required or invalid")
			return
		}
		next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), claimsKey, claims)))
	})
}

// authTokenManager keeps parsing behind Service without leaking repository concerns.
func (a *API) authTokenManager() *auth.TokenManager { return a.auth.Tokens() }
func claimsFrom(r *http.Request) auth.Claims {
	claims, _ := r.Context().Value(claimsKey).(auth.Claims)
	return claims
}

func decode(w http.ResponseWriter, r *http.Request, dst any) bool {
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(dst); err != nil {
		writeError(w, r, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid request")
		return false
	}
	if decoder.Decode(&struct{}{}) != io.EOF {
		writeError(w, r, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid request")
		return false
	}
	return true
}
func requestID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id := uuid.NewString()
		w.Header().Set("X-Request-ID", id)
		next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), requestIDKey, id)))
	})
}

const requestIDKey contextKey = "request_id"

func writeError(w http.ResponseWriter, r *http.Request, status int, code, message string) {
	writeJSON(w, status, errorResponse{Success: false, Error: apiError{Code: code, Message: message, Details: nil, RequestID: r.Context().Value(requestIDKey).(string)}})
}
func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}
