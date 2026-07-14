package auth

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PostgresRepository struct { pool *pgxpool.Pool }
func NewPostgresRepository(pool *pgxpool.Pool) *PostgresRepository { return &PostgresRepository{pool: pool} }

func (r *PostgresRepository) CreateUser(ctx context.Context, email, passwordHash string) (User, error) {
	var user User
	err := r.pool.QueryRow(ctx, `INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email`, email, passwordHash).Scan(&user.ID, &user.Email)
	if isUniqueViolation(err) { return User{}, ErrEmailTaken }
	return user, err
}

func (r *PostgresRepository) FindUserByEmail(ctx context.Context, email string) (User, string, error) {
	var user User; var passwordHash string
	err := r.pool.QueryRow(ctx, `SELECT id, email, password_hash FROM users WHERE email = $1`, email).Scan(&user.ID, &user.Email, &passwordHash)
	if errors.Is(err, pgx.ErrNoRows) { return User{}, "", ErrInvalidCredentials }
	return user, passwordHash, err
}

func (r *PostgresRepository) CreateSession(ctx context.Context, userID uuid.UUID, hash []byte, expiresAt time.Time) (Session, error) {
	var session Session
	err := r.pool.QueryRow(ctx, `INSERT INTO auth_sessions (user_id, refresh_token_hash, expires_at) VALUES ($1, $2, $3) RETURNING id, user_id, expires_at`, userID, hash, expiresAt).Scan(&session.ID, &session.UserID, &session.ExpiresAt)
	return session, err
}

func (r *PostgresRepository) RotateSession(ctx context.Context, oldHash, newHash []byte, expiresAt, now time.Time) (Session, error) {
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil { return Session{}, err }
	defer tx.Rollback(ctx)
	var old Session
	err = tx.QueryRow(ctx, `SELECT id, user_id, expires_at FROM auth_sessions WHERE refresh_token_hash = $1 AND revoked_at IS NULL FOR UPDATE`, oldHash).Scan(&old.ID, &old.UserID, &old.ExpiresAt)
	if errors.Is(err, pgx.ErrNoRows) || (!old.ExpiresAt.After(now) && err == nil) { return Session{}, ErrInvalidSession }
	if err != nil { return Session{}, err }
	if _, err = tx.Exec(ctx, `UPDATE auth_sessions SET revoked_at = $1 WHERE id = $2`, now, old.ID); err != nil { return Session{}, err }
	var next Session
	err = tx.QueryRow(ctx, `INSERT INTO auth_sessions (user_id, refresh_token_hash, expires_at) VALUES ($1, $2, $3) RETURNING id, user_id, expires_at`, old.UserID, newHash, expiresAt).Scan(&next.ID, &next.UserID, &next.ExpiresAt)
	if err != nil { return Session{}, err }
	if err = tx.Commit(ctx); err != nil { return Session{}, err }
	return next, nil
}

func (r *PostgresRepository) RevokeSession(ctx context.Context, userID, sessionID uuid.UUID, now time.Time) error {
	result, err := r.pool.Exec(ctx, `UPDATE auth_sessions SET revoked_at = $1 WHERE id = $2 AND user_id = $3 AND revoked_at IS NULL`, now, sessionID, userID)
	if err != nil { return err }
	if result.RowsAffected() == 0 { return ErrInvalidSession }
	return nil
}

func isUniqueViolation(err error) bool { var pgErr *pgconn.PgError; return errors.As(err, &pgErr) && pgErr.Code == "23505" }
