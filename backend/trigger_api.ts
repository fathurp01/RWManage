import jwt from "jsonwebtoken";

const JWT_SECRET = "rwmanage-local-dev-secret";

const rtUsers = [
  {
    email: "rt001@rwmanage.com",
    payload: {
      id: "f2911199-d6af-4d59-920d-40bcf1cebd76",
      email: "rt001@rwmanage.com",
      role: "RT",
      blok_wilayah_id: "901f73a9-c74b-4f23-8bf1-a76c49b530f8"
    }
  },
  {
    email: "rt002@rwmanage.com",
    payload: {
      id: "d651f400-95ee-4e8d-8359-629e05f888c7",
      email: "rt002@rwmanage.com",
      role: "RT",
      blok_wilayah_id: "43384d16-4123-4ad8-ad79-2f0f76e32693"
    }
  },
  {
    email: "rt003@rwmanage.com",
    payload: {
      id: "047f03d0-483a-47ec-aa61-3f9f21dd3fba",
      email: "rt003@rwmanage.com",
      role: "RT",
      blok_wilayah_id: "f9741c48-248e-450a-982a-60547c96c231"
    }
  }
];

async function main() {
  const testCases = [
    { year: "2026", desc: "year 2026" },
    { year: "2025", desc: "year 2025" },
    { year: "", desc: "no year param" },
  ];

  for (const tc of testCases) {
    console.log(`\n--- Testing ${tc.desc} ---`);
    for (const user of rtUsers) {
      console.log(`Testing API for ${user.email}...`);
      const token = jwt.sign(user.payload, JWT_SECRET);
      try {
        const url = tc.year 
          ? `http://localhost:3000/api/rt/iuran?tahun=${tc.year}`
          : "http://localhost:3000/api/rt/iuran";
        const response = await fetch(url, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });

        console.log("Response Status:", response.status);
        const bodyText = await response.text();
        if (response.status === 200) {
          console.log("Success (returned data summary)");
        } else {
          console.log("Error Response Body:", bodyText);
        }
      } catch (error) {
        console.error("Fetch request failed:", error);
      }
    }
  }
}

main();
