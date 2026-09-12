package lib

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"
	"unicode"
)

var ErrArticleNotFound = errors.New("article not found")

// ArticleInput 创建/更新文章请求体
type ArticleInput struct {
	ID       string   `json:"id"`
	Title    string   `json:"title"`
	Category Category `json:"category"`
	Content  string   `json:"content"`
	Tags     []string `json:"tags"`
}

func normalizeTags(tags []string) []string {
	if len(tags) == 0 {
		return []string{}
	}
	out := make([]string, 0, len(tags))
	seen := map[string]struct{}{}
	for _, t := range tags {
		t = strings.TrimSpace(t)
		if t == "" {
			continue
		}
		key := strings.ToLower(t)
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		out = append(out, t)
	}
	return out
}

func tagsToJSON(tags []string) ([]byte, error) {
	tags = normalizeTags(tags)
	if len(tags) == 0 {
		return []byte("[]"), nil
	}
	return json.Marshal(tags)
}

func tagsFromSQL(raw sql.NullString) []string {
	if !raw.Valid || strings.TrimSpace(raw.String) == "" || raw.String == "null" {
		return []string{}
	}
	var tags []string
	if err := json.Unmarshal([]byte(raw.String), &tags); err != nil {
		return []string{}
	}
	return normalizeTags(tags)
}

func scanArticle(scanner interface {
	Scan(dest ...any) error
}) (Article, error) {
	var (
		a       Article
		tagsRaw sql.NullString
		updated time.Time
	)
	err := scanner.Scan(&a.ID, &a.Title, &a.Category, &a.Content, &tagsRaw, &a.CreatedAt, &updated)
	if err != nil {
		return Article{}, err
	}
	a.Tags = tagsFromSQL(tagsRaw)
	_ = updated
	return a, nil
}

// ListArticlesDB 按分类列出文章（新到旧）
func ListArticlesDB(db *sql.DB, category Category) ([]Article, error) {
	rows, err := db.Query(`
		SELECT id, title, category, content, tags, created_at, updated_at
		FROM articles
		WHERE category = ?
		ORDER BY created_at DESC
	`, string(category))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]Article, 0)
	for rows.Next() {
		a, err := scanArticle(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, a)
	}
	return out, rows.Err()
}

// GetArticleDB 按 ID 取文章
func GetArticleDB(db *sql.DB, id string) (Article, error) {
	row := db.QueryRow(`
		SELECT id, title, category, content, tags, created_at, updated_at
		FROM articles
		WHERE id = ?
	`, id)

	a, err := scanArticle(row)
	if errors.Is(err, sql.ErrNoRows) {
		return Article{}, ErrArticleNotFound
	}
	return a, err
}

// CreateArticleDB 写入新文章
func CreateArticleDB(db *sql.DB, in ArticleInput) (Article, error) {
	title := strings.TrimSpace(in.Title)
	content := strings.TrimSpace(in.Content)
	if title == "" || content == "" {
		return Article{}, fmt.Errorf("title and content are required")
	}
	if in.Category != CategoryReflection && in.Category != CategoryPoetry {
		return Article{}, fmt.Errorf("category must be %q or %q", CategoryReflection, CategoryPoetry)
	}

	id := strings.TrimSpace(in.ID)
	if id == "" {
		id = GenerateArticleID(in.Category, title)
	}

	now := time.Now().UTC()
	tagsJSON, err := tagsToJSON(in.Tags)
	if err != nil {
		return Article{}, err
	}

	_, err = db.Exec(`
		INSERT INTO articles (id, title, category, content, tags, created_at, updated_at)
		VALUES (?, ?, ?, ?, CAST(? AS JSON), ?, ?)
	`, id, title, string(in.Category), content, string(tagsJSON), now, now)
	if err != nil {
		return Article{}, err
	}

	return GetArticleDB(db, id)
}

// UpdateArticleDB 更新已有文章
func UpdateArticleDB(db *sql.DB, id string, in ArticleInput) (Article, error) {
	existing, err := GetArticleDB(db, id)
	if err != nil {
		return Article{}, err
	}

	title := strings.TrimSpace(in.Title)
	if title == "" {
		title = existing.Title
	}
	content := strings.TrimSpace(in.Content)
	if content == "" {
		content = existing.Content
	}
	category := in.Category
	if category == "" {
		category = existing.Category
	}
	if category != CategoryReflection && category != CategoryPoetry {
		return Article{}, fmt.Errorf("category must be %q or %q", CategoryReflection, CategoryPoetry)
	}

	tags := in.Tags
	if tags == nil {
		tags = existing.Tags
	}
	tagsJSON, err := tagsToJSON(tags)
	if err != nil {
		return Article{}, err
	}

	now := time.Now().UTC()
	res, err := db.Exec(`
		UPDATE articles
		SET title = ?, category = ?, content = ?, tags = CAST(? AS JSON), updated_at = ?
		WHERE id = ?
	`, title, string(category), content, string(tagsJSON), now, id)
	if err != nil {
		return Article{}, err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return Article{}, ErrArticleNotFound
	}

	return GetArticleDB(db, id)
}

// DeleteArticleDB 删除文章
func DeleteArticleDB(db *sql.DB, id string) error {
	res, err := db.Exec(`DELETE FROM articles WHERE id = ?`, id)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return ErrArticleNotFound
	}
	return nil
}

// GenerateArticleID 生成可读 ID：r-关于克制 / p-静夜 + 短时间戳防撞
func GenerateArticleID(category Category, title string) string {
	prefix := "r"
	if category == CategoryPoetry {
		prefix = "p"
	}

	slug := slugifyTitle(title)
	if slug == "" {
		slug = "post"
	}
	if len(slug) > 32 {
		slug = slug[:32]
	}

	return fmt.Sprintf("%s-%s-%s", prefix, slug, time.Now().UTC().Format("150405"))
}

func slugifyTitle(title string) string {
	var b strings.Builder
	lastDash := false
	for _, r := range strings.TrimSpace(title) {
		switch {
		case unicode.IsLetter(r) || unicode.IsDigit(r):
			b.WriteRune(unicode.ToLower(r))
			lastDash = false
		case r == ' ' || r == '-' || r == '_' || r == '/':
			if !lastDash && b.Len() > 0 {
				b.WriteByte('-')
				lastDash = true
			}
		}
	}
	return strings.Trim(b.String(), "-")
}
