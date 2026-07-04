const ServiceCard = ({ category }) => {
  return (
    <div
      className="service-card"
      style={{
        background: category.color_gradient || "#f5f5f5",
      }}
    >
      {category.icon_url && (
        <img
          src={category.icon_url}
          alt={category.name}
          className="service-icon"
        />
      )}

      <h3>{category.name}</h3>
    </div>
  );
};

export default ServiceCard;