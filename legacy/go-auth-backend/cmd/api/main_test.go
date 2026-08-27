package main

import (
	"testing"
	"time"
)

func TestDurationEnv(t *testing.T) {
	t.Setenv("ACCESS_TOKEN_TTL", "")
	if got, err := durationEnv("ACCESS_TOKEN_TTL", 15*time.Minute); err != nil || got != 15*time.Minute {
		t.Fatalf("default duration = %v, %v", got, err)
	}
	t.Setenv("ACCESS_TOKEN_TTL", "20m")
	if got, err := durationEnv("ACCESS_TOKEN_TTL", time.Minute); err != nil || got != 20*time.Minute {
		t.Fatalf("configured duration = %v, %v", got, err)
	}
	t.Setenv("ACCESS_TOKEN_TTL", "0")
	if _, err := durationEnv("ACCESS_TOKEN_TTL", time.Minute); err == nil {
		t.Fatal("expected invalid duration error")
	}
}
