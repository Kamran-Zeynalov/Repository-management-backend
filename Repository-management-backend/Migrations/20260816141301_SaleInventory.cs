using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Repository_management_backend.Migrations
{
    /// <inheritdoc />
    public partial class SaleInventory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "CustomerLedgerEntries",
                keyColumn: "Id",
                keyValue: 1);

            migrationBuilder.DeleteData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 2);

            migrationBuilder.DeleteData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 3);

            migrationBuilder.DeleteData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 4);

            migrationBuilder.DeleteData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 5);

            migrationBuilder.DeleteData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 6);

            migrationBuilder.DeleteData(
                table: "InventoryStocks",
                keyColumn: "Id",
                keyValue: 1);

            migrationBuilder.DeleteData(
                table: "InventoryStocks",
                keyColumn: "Id",
                keyValue: 2);

            migrationBuilder.DeleteData(
                table: "InvoiceItems",
                keyColumn: "Id",
                keyValue: 1);

            migrationBuilder.DeleteData(
                table: "InvoiceItems",
                keyColumn: "Id",
                keyValue: 2);

            migrationBuilder.DeleteData(
                table: "Invoices",
                keyColumn: "Id",
                keyValue: 1);

            migrationBuilder.DeleteData(
                table: "Customers",
                keyColumn: "Id",
                keyValue: 1);

            migrationBuilder.CreateTable(
                name: "InventorySales",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    BranchId = table.Column<int>(type: "int", nullable: false),
                    InventoryStockId = table.Column<int>(type: "int", nullable: false),
                    StockNameSnapshot = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Quantity = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    UnitPrice = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    TotalAmount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    CustomerName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    Note = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    SoldByUserId = table.Column<int>(type: "int", nullable: false),
                    SoldByUserName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    SoldAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InventorySales", x => x.Id);
                    table.ForeignKey(
                        name: "FK_InventorySales_Branches_BranchId",
                        column: x => x.BranchId,
                        principalTable: "Branches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_InventorySales_InventoryStocks_InventoryStockId",
                        column: x => x.InventoryStockId,
                        principalTable: "InventoryStocks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_InventorySales_BranchId",
                table: "InventorySales",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_InventorySales_InventoryStockId",
                table: "InventorySales",
                column: "InventoryStockId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "InventorySales");

            migrationBuilder.InsertData(
                table: "Customers",
                columns: new[] { "Id", "Address", "BranchId", "CreatedAt", "ExtraPhone", "Name", "Note", "Phone", "UpdatedAt" },
                values: new object[,]
                {
                    { 1, null, 1, new DateTime(2025, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, "Test Müştəri 1", null, "+994 50 100 10 01", null },
                    { 2, null, 1, new DateTime(2025, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, "Test Müştəri 2", null, "+994 50 100 10 02", null },
                    { 3, null, 2, new DateTime(2025, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, "Test Müştəri 3", null, "+994 50 100 10 03", null },
                    { 4, null, 2, new DateTime(2025, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, "Test Müştəri 4", null, "+994 50 100 10 04", null },
                    { 5, null, 3, new DateTime(2025, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, "Test Müştəri 5", null, "+994 50 100 10 05", null },
                    { 6, null, 3, new DateTime(2025, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, "Test Müştəri 6", null, "+994 50 100 10 06", null }
                });

            migrationBuilder.InsertData(
                table: "InventoryStocks",
                columns: new[] { "Id", "BranchId", "Name", "TotalCount" },
                values: new object[,]
                {
                    { 1, 1, "Lesa", 20m },
                    { 2, 1, "Taxta", 100m }
                });

            migrationBuilder.InsertData(
                table: "Invoices",
                columns: new[] { "Id", "Address", "BranchId", "ClosedAt", "CreatedAt", "CustomerId", "CustomerNameSnapshot", "DepositAmount", "ExtraPhone", "InvoiceDate", "InvoiceNo", "IsClosed", "Note", "PaidAmount", "Phone", "RemainingDebt", "ReturnDate", "TotalAmount", "UpdatedAt" },
                values: new object[] { 1, null, 1, null, new DateTime(2025, 6, 1, 0, 0, 0, 0, DateTimeKind.Utc), 1, "Test Müştəri 1", 100m, null, new DateTime(2025, 6, 1, 0, 0, 0, 0, DateTimeKind.Utc), "0001", false, null, 200m, "+994 50 100 10 01", 300m, new DateTime(2025, 7, 1, 0, 0, 0, 0, DateTimeKind.Utc), 500m, new DateTime(2025, 6, 1, 0, 0, 0, 0, DateTimeKind.Utc) });

            migrationBuilder.InsertData(
                table: "CustomerLedgerEntries",
                columns: new[] { "Id", "Amount", "CustomerId", "Date", "DebtChange", "DepositChange", "InvoiceId", "Note", "Source", "Type" },
                values: new object[] { 1, 500m, 1, new DateTime(2025, 6, 1, 0, 0, 0, 0, DateTimeKind.Utc), 300m, 100m, 1, null, "invoice", "Mal götürüb (qaimə #0001)" });

            migrationBuilder.InsertData(
                table: "InvoiceItems",
                columns: new[] { "Id", "BoardCount", "Category", "CustomPrice", "DailyPrice", "DayCount", "DueDate", "ExtraBoardCount", "ExtraBoardPrice", "HeadCount", "InvoiceId", "IsFixedFee", "IsRecurring", "IsReturnable", "Label", "LesaExtraTaxtaCount", "LesaExtraTaxtaPrice", "LesaFreeTaxtaCount", "LesaHeadCount", "LesaHeadPrice", "LesaLongRodCount", "LesaShortRodCount", "Note", "PalesCount", "PoleCategoryId", "Quantity", "RentMode", "ReturnedQuantity", "RodCount", "Size", "Subtotal", "Unit", "VariantId", "VilkaCount" },
                values: new object[,]
                {
                    { 1, null, "Lesa", 50m, null, null, null, null, null, null, 1, false, true, true, null, null, null, null, null, null, null, null, null, null, null, 5m, null, 0m, null, null, 250m, "ədəd", null, null },
                    { 2, null, "Taxta", 10m, null, null, null, null, null, null, 1, false, true, true, null, null, null, null, null, null, null, null, null, null, null, 25m, null, 0m, null, null, 250m, "ədəd", null, null }
                });
        }
    }
}
