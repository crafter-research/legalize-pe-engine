import { GitHubApiError } from "@legalize-pe/git-reader";
import { NextResponse } from "next/server";

// Maps a git-reader error to an HTTP response. A missing commit, norm, or file
// (GitHub 404/422) is a client error -> 404; anything else is a real failure -> 500.
export function gitErrorResponse(error: unknown, serverMessage: string) {
  if (error instanceof GitHubApiError && (error.status === 404 || error.status === 422)) {
    return NextResponse.json(
      { error: "No se encontró la norma o el commit indicado" },
      { status: 404 },
    );
  }
  console.error(serverMessage, error);
  return NextResponse.json({ error: serverMessage }, { status: 500 });
}
