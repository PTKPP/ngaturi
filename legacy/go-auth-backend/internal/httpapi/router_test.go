package httpapi

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/okee/ngaturi/internal/auth"
)

func TestLogoutRejectsMalformedBearerToken(t *testing.T) {
	service := auth.NewService(nil, auth.NewTokenManager([]byte("01234567890123456789012345678901"), time.Minute, time.Hour))
	request := httptest.NewRequest(http.MethodPost, "/api/v1/auth/logout", nil)
	request.Header.Set("Authorization", "Bearer not-a-jwt")
	response := httptest.NewRecorder()

	NewRouter(service).ServeHTTP(response, request)
	if response.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusUnauthorized)
	}
}
