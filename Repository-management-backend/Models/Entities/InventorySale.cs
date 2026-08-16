namespace Repository_management_backend.Models.Entities
{
    /// <summary>Anbardan İCARƏ deyil, BİR DƏFƏLİK SATIŞ tarixçəsi. Satış olunanda
    /// InventoryStock.TotalCount HƏMİŞƏLİK azalır (icarədən fərqli olaraq, geri
    /// qayıtması gözlənilmir) — bu cədvəl isə həmin əməliyyatın izini saxlayır
    /// (kim, nə vaxt, neçəyə satıb — hesabat/audit üçün).</summary>
    public class InventorySale
    {
        public int Id { get; set; }

        public int BranchId { get; set; }
        public Branch? Branch { get; set; }

        public int InventoryStockId { get; set; }
        public InventoryStock? InventoryStock { get; set; }
        // Mal sonradan silinsə/adı dəyişsə belə tarixçə oxunaqlı qalsın deyə.
        public string StockNameSnapshot { get; set; } = string.Empty;

        public decimal Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal TotalAmount { get; set; }

        public string? CustomerName { get; set; }
        public string? Note { get; set; }

        public int SoldByUserId { get; set; }
        public string? SoldByUserName { get; set; }

        public DateTime SoldAt { get; set; } = DateTime.UtcNow;
    }
}
