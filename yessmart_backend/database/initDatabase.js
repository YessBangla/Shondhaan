const createCategoriesTable = require("./categories.table");
const createSubCategoriesTable = require("./sub_categories.table");
const createSellersTable = require("./sellers.table");
const createProductsTable = require("./products.table");

async function initDatabase() {
  await createCategoriesTable();
  console.log("Categories table initialized.");

  await createSubCategoriesTable();
  console.log("Sub-categories table initialized.");

  await createSellersTable();
  console.log("Sellers table initialized.");

  await createProductsTable();
  console.log("Products table initialized.");
}

module.exports = initDatabase;
