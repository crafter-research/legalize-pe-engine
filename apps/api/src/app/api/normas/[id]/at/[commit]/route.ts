import path from "node:path";
import { GitService } from "@legalize-pe/git-reader";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commit: string }> },
) {
  const { id, commit } = await params;

  try {
    // Go up from apps/api to monorepo root
    const repoPath = path.join(process.cwd(), "..", "..");
    const gitService = new GitService(repoPath);

    const version = await gitService.getContentAtCommit(id, commit);

    if (!version) {
      return NextResponse.json(
        { error: "No se encontró contenido para esta versión" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      data: version,
    });
  } catch (error) {
    console.error("Error fetching content at commit:", error);
    return NextResponse.json(
      { error: "Error al obtener el contenido de la versión" },
      { status: 500 },
    );
  }
}
