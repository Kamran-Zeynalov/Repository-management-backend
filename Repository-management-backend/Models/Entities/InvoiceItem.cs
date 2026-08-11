namespace Repository_management_backend.Models.Entities
{
    public class InvoiceItem
    {
        public int Id { get; set; }

        public int InvoiceId { get; set; }
        public Invoice? Invoice { get; set; }

        public string Category { get; set; } = string.Empty;
        public string? Label { get; set; }
        public string? VariantId { get; set; }
        public string? Size { get; set; }
        public string? Unit { get; set; }
        public decimal Quantity { get; set; }
        public decimal CustomPrice { get; set; }
        public decimal Subtotal { get; set; }
        public string? Note { get; set; }

        public bool IsReturnable { get; set; } = true;
        public bool IsRecurring { get; set; } = true;
        public bool IsFixedFee { get; set; }
        public decimal ReturnedQuantity { get; set; }

        public string? RentMode { get; set; }
        public DateTime? DueDate { get; set; }
        public int? DayCount { get; set; }
        public decimal? DailyPrice { get; set; }

        public int? LesaHeadCount { get; set; }
        public decimal? LesaHeadPrice { get; set; }
        public int? LesaLongRodCount { get; set; }
        public int? LesaShortRodCount { get; set; }
        public int? LesaFreeTaxtaCount { get; set; }
        public int? LesaExtraTaxtaCount { get; set; }
        public decimal? LesaExtraTaxtaPrice { get; set; }

        public int? HeadCount { get; set; }
        public int? RodCount { get; set; }
        public int? VilkaCount { get; set; }
        public int? BoardCount { get; set; }
        public int? ExtraBoardCount { get; set; }
        public decimal? ExtraBoardPrice { get; set; }

        public int? PoleCategoryId { get; set; }
        public int? PalesCount { get; set; }
    }
}
