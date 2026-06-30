import { gitErrorResponse } from "@/lib/git-errors";
import { createGitService } from "@legalize-pe/git-reader";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commit: string }> },
) {
  const { id, commit } = await params;

  try {
    const gitService = createGitService();

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
    return gitErrorResponse(error, "Error al obtener el contenido de la versión");
  }
}
