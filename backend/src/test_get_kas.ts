import { Request, Response } from "express";
import { getKasMasjid } from "./controllers/kasMasjidController";

async function main() {
  const req = {
    user: { id: "2b90f4a6-2745-4761-8147-28183c31b665" },
    query: { masjid_id: "96c9400b-f840-49dc-9e82-8c5902391721" }
  } as unknown as Request;

  const res = {
    status(code: number) {
      console.log("Status called with code:", code);
      return this;
    },
    json(data: any) {
      console.log("Json called with data:", JSON.stringify(data, null, 2));
      return this;
    }
  } as unknown as Response;

  try {
    console.log("Running getKasMasjid controller handler...");
    await getKasMasjid(req, res);
  } catch (error) {
    console.error("Unhanded controller error:", error);
  }
}

main();
