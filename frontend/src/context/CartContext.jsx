import { createContext, useContext, useState, useEffect } from 'react';

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => {
    try {
      const savedCart = localStorage.getItem('milk_tea_cart');
      return savedCart ? JSON.parse(savedCart) : [];
    } catch (e) {
      console.error('Lỗi đọc giỏ hàng từ localStorage:', e);
      return [];
    }
  });

  const [deliveryFee] = useState(20000); // Phí ship cố định 20k cho trang Checkout

  useEffect(() => {
    try {
      localStorage.setItem('milk_tea_cart', JSON.stringify(cartItems));
    } catch (e) {
      console.error('Lỗi lưu giỏ hàng vào localStorage:', e);
    }
  }, [cartItems]);

  const addToCart = (product, options = {}) => {
    const {
      size = 'Regular',
      sugar = '100% Sugar',
      ice = 'Regular Ice',
      selectedToppings = [],
      quantity = 1,
      note = '',
    } = options;

    const toppingTotal = selectedToppings.reduce(
      (sum, t) => sum + Number(t.GIA_TOPPING || t.price || 0),
      0
    );

    const basePrice = Number(product.GIA_BAN || product.price || 0);
    const unitPrice = basePrice + toppingTotal;

    const toppingIds = selectedToppings
      .map((t) => t.MA_TOPPING)
      .sort()
      .join('-');
    
    const cleanNote = note.trim();
    const cartItemId = `${product.MA_SP || product.id}-${size}-${sugar}-${ice}-${toppingIds}-${cleanNote}`;

    setCartItems((prevItems) => {
      const existingIndex = prevItems.findIndex((item) => item.cartItemId === cartItemId);

      if (existingIndex > -1) {
        const updated = [...prevItems];
        updated[existingIndex].quantity += quantity;
        return updated;
      }

      return [
        ...prevItems,
        {
          cartItemId,
          product,
          MA_SP: product.MA_SP || product.id,
          TEN_SP: product.TEN_SP || product.name,
          HINH_ANH: product.HINH_ANH || product.image,
          basePrice,
          unitPrice,
          quantity,
          size,
          sugar,
          ice,
          note: cleanNote,
          selectedToppings,
        },
      ];
    });
  };

  const updateQuantity = (cartItemId, delta) => {
    setCartItems((prevItems) =>
      prevItems
        .map((item) => {
          if (item.cartItemId === cartItemId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const removeFromCart = (cartItemId) => {
    setCartItems((prevItems) => prevItems.filter((item) => item.cartItemId !== cartItemId));
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const getCartCount = () => {
    return cartItems.reduce((total, item) => total + (item.quantity || 0), 0);
  };

  const getSubtotal = () => {
    return cartItems.reduce(
      (total, item) => total + Number(item.unitPrice || 0) * Number(item.quantity || 0),
      0
    );
  };

  const getDeliveryFee = () => deliveryFee;

  const getTotalPrice = () => getSubtotal();

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        getCartCount,
        getSubtotal,
        getDeliveryFee,
        getTotalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart phải được dùng bên trong CartProvider');
  }
  return context;
};

export default CartContext;