import path from "node:path";
import { GitService } from "@legalize-pe/git-reader";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    // Go up from apps/api to monorepo root
    const repoPath = path.join(process.cwd(), "..", "..");
    const gitService = new GitService(repoPath);

    const commits = await gitService.getHistory(id);

    if (!commits || commits.length === 0) {
      return NextResponse.json(
        { error: "No se encontró historial para esta norma" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      data: commits,
    });
  } catch (error) {
    console.error("Error fetching history:", error);
    return NextResponse.json({ error: "Error al obtener el historial" }, { status: 500 });
  }
}
