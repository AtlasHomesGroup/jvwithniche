import { NextResponse } from "next/server";

export function json<T extends object>(body: T, status = 200) {
  return NextResponse.json(body, { status });
}

export function notImplemented(milestone: string) {
  return NextResponse.json(
    { error: "not_implemented", milestone },
    { status: 501 },
  );
}

export function badRequest(message: string, details?: unknown) {
  return NextResponse.json(
    { error: "bad_request", message, details },
    { status: 400 },
  );
}

export function unauthorized(message = "unauthorized") {
  return NextResponse.json({ error: "unauthorized", message }, { status: 401 });
}

export function serverError(message = "internal_error") {
  return NextResponse.json(
    { error: "internal_error", message },
    { status: 500 },
  );
}
