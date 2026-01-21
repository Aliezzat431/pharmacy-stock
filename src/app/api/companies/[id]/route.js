import { NextResponse } from "next/server";
import { getDb } from "@/app/lib/db";
import { verifyToken } from "@/app/lib/verifyToken";

// PATCH company by ID
export async function PATCH(req, { params }) {
  try {
    const user = verifyToken(req.headers);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { id } = await params;

    const db = await getDb();
    const result = await db.run('UPDATE companies SET name = ? WHERE id = ?', [body.name, id]);

    if (result.changes === 0) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    return NextResponse.json({ id, name: body.name });
  } catch (error) {
    console.error("PATCH company error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// DELETE company by ID
export async function DELETE(req, { params }) {
  try {
    const user = verifyToken(req.headers);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const db = await getDb();
    const result = await db.run('DELETE FROM companies WHERE id = ?', [id]);

    if (result.changes === 0) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Deleted successfully", id });
  } catch (error) {
    console.error("DELETE company error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
