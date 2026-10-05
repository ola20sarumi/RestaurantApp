using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddCustomerDetailsToOrder : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CustomerName",
                table: "Orders",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "CustomerPhone",
                table: "Orders",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "DeliveryAddress",
                table: "Orders",
                type: "nvarchar(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FulfillmentType",
                table: "Orders",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Takeout");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CustomerName",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "CustomerPhone",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "DeliveryAddress",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "FulfillmentType",
                table: "Orders");
        }
    }
}
