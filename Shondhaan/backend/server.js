import { initDatabase } from "./db/init.js";
import app from "./app.js";
import { PORT } from "./config/env.js";
import { getBackendBaseUrl } from "./utils/baseUrl.js";

initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      const backendBaseUrl = getBackendBaseUrl();
      console.log(`Server running on ${backendBaseUrl}`);
    });
  })
  .catch((error) => {
    console.error("Failed to start backend:", error);
    process.exit(1);
  });