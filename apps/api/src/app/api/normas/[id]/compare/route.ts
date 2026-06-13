import { createGitService } from "@legalize-pe/git-reader";
import { type NextRequest, NextResponse } from "next/server";

// Returns the full content of a norm at two commits side by side, so callers
// can render their own comparison. For a line-level diff use /diff instead.
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

    const [fromVersion, toVersion] = await Promise.all([
      gitService.getContentAtCommit(id, from),
      gitService.getContentAtCommit(id, to),
    ]);

    return NextResponse.json({
      data: {
        identificador: id,
        from: fromVersion,
        to: toVersion,
      },
    });
  } catch (error) {
    console.error("Error comparing versions:", error);
    return NextResponse.json({ error: "Error al comparar las versiones" }, { status: 500 });
  }
}
