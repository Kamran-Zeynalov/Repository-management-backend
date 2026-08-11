using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Repository_management_backend.Migrations
{
    /// <inheritdoc />
    public partial class SeedData : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "Categories",
                columns: new[] { "Id", "BranchId", "Info", "Kind", "Name", "Note", "ParentId", "Price", "RentType", "Unit" },
                values: new object[,]
                {
                    { 1, 1, null, "Standard", "Lesa", null, null, 50m, "Monthly", "ədəd" },
                    { 2, 1, null, "Standard", "Təkərli lesa", null, null, 5m, "Daily", "ədəd" },
                    { 3, 1, null, "Standard", "Dəmir dirək", null, null, 30m, "Monthly", "ədəd" },
                    { 4, 1, null, "Standard", "Taxta", null, null, 10m, "Monthly", "ədəd" },
                    { 5, 1, null, "Standard", "Vibrator", null, null, 8m, "Daily", "ədəd" },
                    { 6, 2, null, "Standard", "Lesa", null, null, 50m, "Monthly", "ədəd" },
                    { 7, 2, null, "Standard", "Təkərli lesa", null, null, 5m, "Daily", "ədəd" },
                    { 8, 2, null, "Standard", "Dəmir dirək", null, null, 30m, "Monthly", "ədəd" },
                    { 9, 2, null, "Standard", "Taxta", null, null, 10m, "Monthly", "ədəd" },
                    { 10, 2, null, "Standard", "Vibrator", null, null, 8m, "Daily", "ədəd" },
                    { 11, 3, null, "Standard", "Lesa", null, null, 50m, "Monthly", "ədəd" },
                    { 12, 3, null, "Standard", "Təkərli lesa", null, null, 5m, "Daily", "ədəd" },
                    { 13, 3, null, "Standard", "Dəmir dirək", null, null, 30m, "Monthly", "ədəd" },
                    { 14, 3, null, "Standard", "Taxta", null, null, 10m, "Monthly", "ədəd" },
                    { 15, 3, null, "Standard", "Vibrator", null, null, 8m, "Daily", "ədəd" }
                });

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

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: 1);

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: 2);

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: 3);

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: 4);

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: 5);

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: 6);

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: 7);

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: 8);

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: 9);

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: 10);

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: 11);

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: 12);

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: 13);

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: 14);

            migrationBuilder.DeleteData(
                table: "Categories",
                keyColumn: "Id",
                keyValue: 15);

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
        }
    }
}
