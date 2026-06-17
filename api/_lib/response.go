package lib

import (
	"encoding/json"
	"net/http"
)

func SetCORS(w http.ResponseWriter) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
	w.Header().Set("Access-Control-Max-Age", "86400")
}

func WriteJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	enc := json.NewEncoder(w)
	enc.SetIndent("", "  ")
	_ = enc.Encode(data)
}

func HandleOptions(w http.ResponseWriter, r *http.Request) bool {
	if r.Method == http.MethodOptions {
		SetCORS(w)
		w.WriteHeader(http.StatusNoContent)
		return true
	}
	return false
}
