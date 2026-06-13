import { gitErrorResponse } from "@/lib/git-errors";
import { createGitService } from "@legalize-pe/git-reader";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);

  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!from || !to) {
    return NextResponse.json(
      { error: 'Se requieren los parámetros "from" y "to"' },
      { status: 400 },
    );
  }

  try {
    const gitService = createGitService();

    const diff = await gitService.getDiff(id, from, to);

    return NextResponse.json({
      data: diff,
    });
  } catch (error) {
    return gitErrorResponse(error, "Error al obtener las diferencias");
  }
}
