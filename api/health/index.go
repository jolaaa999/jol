package handler

import (
	"net/http"

	"github.com/jol/blog/api/_lib"
)

func Handler(w http.ResponseWriter, r *http.Request) {
	lib.SetCORS(w)
	if lib.HandleOptions(w, r) {
		return
	}

	lib.WriteJSON(w, http.StatusOK, map[string]string{
		"status":  "ok",
		"service": "jol-api",
		"version": "0.1.0",
	})
}
