const fs = require('fs');
const path = require('path');

// Update rtRoutes.ts
const rtRoutesPath = path.join(__dirname, 'src', 'routes', 'rtRoutes.ts');
let rtContent = fs.readFileSync(rtRoutesPath, 'utf8');
rtContent = rtContent.replace('} from "../controllers/rtController";', ', bayarIuranForRt } from "../controllers/rtController";');
rtContent += '\nrouter.post("/iuran/bayar", bayarIuranForRt);\n';
fs.writeFileSync(rtRoutesPath, rtContent);

// Update index.ts
const indexPath = path.join(__dirname, 'src', 'index.ts');
let indexContent = fs.readFileSync(indexPath, 'utf8');

const imports = `import pengaturanIuranRoutes from "./routes/pengaturanIuranRoutes";
import kasRTRoutes from "./routes/kasRTRoutes";
import setoranIuranRoutes from "./routes/setoranIuranRoutes";
`;

indexContent = indexContent.replace('import rtRoutes from "./routes/rtRoutes";', imports + 'import rtRoutes from "./routes/rtRoutes";');

const routes = `app.use("/api/pengaturan-iuran", pengaturanIuranRoutes);
app.use("/api/kas-rt", kasRTRoutes);
app.use("/api/setoran-iuran", setoranIuranRoutes);
`;

indexContent = indexContent.replace('app.use("/api/rt", rtRoutes);', routes + 'app.use("/api/rt", rtRoutes);');
fs.writeFileSync(indexPath, indexContent);
