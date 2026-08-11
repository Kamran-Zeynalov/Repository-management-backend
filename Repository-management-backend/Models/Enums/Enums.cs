namespace Repository_management_backend.Models.Enums
{
    public enum UserRole
    {
        Admin,
        Manager,
        User
    }

    public enum CategoryKind
    {
        Standard,
        Extra,
        Service,
        Pole
    }

    public enum RentType
    {
        Monthly,
        Daily
    }

    public enum PaymentDirection
    {
        In,
        Out
    }
}
