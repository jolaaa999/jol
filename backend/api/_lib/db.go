package lib

import (
	"database/sql"
	"errors"
	"os"
	"sync"
	"time"

	_ "github.com/go-sql-driver/mysql"
)

var (
	ErrNoDSN = errors.New("MYSQL_DSN is not configured")

	dbOnce sync.Once
	dbInst *sql.DB
	dbErr  error
)

// OpenDB 返回进程内复用的 MySQL 连接池。
// DSN 示例：user:pass@tcp(127.0.0.1:3306)/jol?parseTime=true&charset=utf8mb4&loc=UTC
func OpenDB() (*sql.DB, error) {
	dbOnce.Do(func() {
		dsn := os.Getenv("MYSQL_DSN")
		if dsn == "" {
			dbErr = ErrNoDSN
			return
		}

		db, err := sql.Open("mysql", dsn)
		if err != nil {
			dbErr = err
			return
		}

		db.SetMaxOpenConns(8)
		db.SetMaxIdleConns(2)
		db.SetConnMaxLifetime(4 * time.Minute)
		db.SetConnMaxIdleTime(60 * time.Second)

		if err := db.Ping(); err != nil {
			_ = db.Close()
			dbErr = err
			return
		}

		dbInst = db
	})

	if dbErr != nil {
		return nil, dbErr
	}
	return dbInst, nil
}

// HasMySQL 是否配置了可用的 MYSQL_DSN（不强制 Ping）
func HasMySQL() bool {
	return os.Getenv("MYSQL_DSN") != ""
}
