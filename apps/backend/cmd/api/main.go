package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/okee/ngaturi/internal/auth"
	"github.com/okee/ngaturi/internal/httpapi"
)

func main() {
	ctx := context.Background()
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		log.Fatal("DATABASE_URL is required")
	}
	jwtSecret := []byte(os.Getenv("JWT_SECRET"))
	if len(jwtSecret) < 32 {
		log.Fatal("JWT_SECRET must be at least 32 bytes")
	}
	accessTTL, err := durationEnv("ACCESS_TOKEN_TTL", 15*time.Minute)
	if err != nil {
		log.Fatal(err)
	}
	refreshTTL, err := durationEnv("REFRESH_TOKEN_TTL", 30*24*time.Hour)
	if err != nil {
		log.Fatal(err)
	}
	if refreshTTL <= accessTTL {
		log.Fatal("REFRESH_TOKEN_TTL must be greater than ACCESS_TOKEN_TTL")
	}

	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		log.Fatalf("connect database: %v", err)
	}
	defer pool.Close()
	if err := pool.Ping(ctx); err != nil {
		log.Fatalf("ping database: %v", err)
	}

	service := auth.NewService(auth.NewPostgresRepository(pool), auth.NewTokenManager(jwtSecret, accessTTL, refreshTTL))
	server := &http.Server{
		Addr:              envOr("HTTP_ADDR", ":8080"),
		Handler:           httpapi.NewRouter(service),
		ReadHeaderTimeout: 5 * time.Second,
	}
	log.Printf("listening on %s", server.Addr)
	log.Fatal(server.ListenAndServe())
}

func envOr(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func durationEnv(key string, fallback time.Duration) (time.Duration, error) {
	value := os.Getenv(key)
	if value == "" {
		return fallback, nil
	}
	duration, err := time.ParseDuration(value)
	if err != nil || duration <= 0 {
		return 0, fmt.Errorf("%s must be a positive Go duration", key)
	}
	return duration, nil
}
