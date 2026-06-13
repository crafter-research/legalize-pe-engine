import { createGitService } from "@legalize-pe/git-reader";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const gitService = createGitService();

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
