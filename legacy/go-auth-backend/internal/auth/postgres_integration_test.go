package auth

import (
	"context"
	"errors"
	"os"
	"sync"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func TestPostgresAuthIntegration(t *testing.T) {
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		t.Skip("DATABASE_URL is required for PostgreSQL integration tests")
	}
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		t.Fatalf("connect database: %v", err)
	}
	defer pool.Close()

	var databaseName string
	if err := pool.QueryRow(ctx, "SELECT current_database()").Scan(&databaseName); err != nil {
		t.Fatal(err)
	}
	if databaseName != "ngaturi_test" {
		t.Fatalf("integration tests require ngaturi_test, got %q", databaseName)
	}
	if _, err := pool.Exec(ctx, "TRUNCATE auth_sessions, users CASCADE"); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		_, _ = pool.Exec(context.Background(), "TRUNCATE auth_sessions, users CASCADE")
	})

	service := NewService(NewPostgresRepository(pool), NewTokenManager([]byte("01234567890123456789012345678901"), time.Minute, time.Hour))
	pair, err := service.Register(ctx, "Owner@Example.com", "a-secure-password")
	if err != nil {
		t.Fatalf("register: %v", err)
	}
	if _, err := service.Register(ctx, " owner@example.COM ", "a-secure-password"); !errors.Is(err, ErrEmailTaken) {
		t.Fatalf("duplicate register error = %v", err)
	}
	if _, err := service.Login(ctx, "owner@example.com", "wrong-password"); !errors.Is(err, ErrInvalidCredentials) {
		t.Fatalf("wrong password error = %v", err)
	}
	if _, err := service.Login(ctx, "missing@example.com", "a-secure-password"); !errors.Is(err, ErrInvalidCredentials) {
		t.Fatalf("unknown email error = %v", err)
	}

	rotated, err := service.Refresh(ctx, pair.RefreshToken)
	if err != nil {
		t.Fatalf("refresh: %v", err)
	}
	if _, err := service.Refresh(ctx, pair.RefreshToken); !errors.Is(err, ErrInvalidSession) {
		t.Fatalf("reused refresh error = %v", err)
	}
	claims, err := service.Tokens().Parse(rotated.AccessToken)
	if err != nil {
		t.Fatalf("parse access token: %v", err)
	}
	if err := service.Logout(ctx, claims); err != nil {
		t.Fatalf("logout: %v", err)
	}
	if _, err := service.Refresh(ctx, rotated.RefreshToken); !errors.Is(err, ErrInvalidSession) {
		t.Fatalf("refresh after logout error = %v", err)
	}

	concurrentPair, err := service.Login(ctx, "owner@example.com", "a-secure-password")
	if err != nil {
		t.Fatalf("login for concurrent refresh: %v", err)
	}
	start := make(chan struct{})
	errorsByRequest := make(chan error, 2)
	var wait sync.WaitGroup
	for range 2 {
		wait.Add(1)
		go func() {
			defer wait.Done()
			<-start
			_, err := service.Refresh(ctx, concurrentPair.RefreshToken)
			errorsByRequest <- err
		}()
	}
	close(start)
	wait.Wait()
	close(errorsByRequest)
	var successes, rejected int
	for err := range errorsByRequest {
		if err == nil {
			successes++
		} else if errors.Is(err, ErrInvalidSession) {
			rejected++
		} else {
			t.Fatalf("concurrent refresh error = %v", err)
		}
	}
	if successes != 1 || rejected != 1 {
		t.Fatalf("concurrent refresh successes=%d rejected=%d, want 1 each", successes, rejected)
	}
}
