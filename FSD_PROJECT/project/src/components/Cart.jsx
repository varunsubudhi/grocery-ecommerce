import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import { toast } from 'react-toastify';
import "react-datepicker/dist/react-datepicker.css";
import '../styles/Cart.css';
import { createOrder } from '../services/orderApi';

const Cart = ({ items, onClose, onUpdateQuantity, onRemoveItem, isFirstTimeUser, calculateDiscount }) => {
  const [deliveryDate, setDeliveryDate] = useState(null);
  const [isPreOrder, setIsPreOrder] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [checkoutMessage, setCheckoutMessage] = useState("");
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [selectedPaymentType, setSelectedPaymentType] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const hasNaturalProducts = items.some(item => item.type === 'natural');
  const hasPackagedProducts = items.some(item => item.type === 'packaged');

  const total = items.reduce((sum, item) => {
    const finalPrice = calculateDiscount(item.price, item.discount);
    return sum + finalPrice * item.quantity;
  }, 0);

  const handlePreOrderToggle = (checked) => {
    if (checked && hasPackagedProducts) {
      toast.warning("Pre-order is only available for natural products (meat, seafood, eggs, honey). Please remove packaged items to enable pre-order.", {
        position: "top-center",
        autoClose: 5000
      });
      return;
    }
    setIsPreOrder(checked);
  };

  const handleCheckout = async () => {
    if (items.length === 0) {
      toast.warning("Your cart is empty!");
      return;
    }
    setShowPaymentModal(true);
  };

  const handlePaymentSelection = async (paymentType) => {
    setSelectedPaymentType(paymentType);
    setShowPaymentModal(false);
    
    try {
      setIsCheckingOut(true);
      
      // Prepare order data
      const orderData = {
        items: items.map(item => ({
          productId: item.id,
          name: item.name,
          quantity: item.quantity,
          price: calculateDiscount(item.price, item.discount || 0)
        })),
        totalAmount: items.reduce((total, item) => {
          const discountedPrice = calculateDiscount(item.price, item.discount || 0);
          return total + (discountedPrice * item.quantity);
        }, 0),
        paymentType: paymentType,
        deliveryDate: isPreOrder ? deliveryDate : null
      };

      // Create order in the database
      await createOrder(orderData);
      
      // Prepare success message with item names
      const itemNames = items.map(item => `${item.name} (${item.quantity})`).join(', ');
      const successMessage = `Order placed successfully! 
        Items: ${itemNames}
        Payment method: ${paymentType}`;
      
      // Show success message
      toast.success(successMessage);
      
      // Clear the cart
      items.forEach(item => onRemoveItem(item.id));
      
      // Close the cart
      onClose();
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Failed to place order. Please try again.');
    } finally {
      setIsCheckingOut(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    window.location.reload();
  };

  return (
    <div className="cart-sidebar">
      <div className="cart">
        <button onClick={onClose} className="close-cart-btn">×</button>
        <h2>Shopping Cart</h2>
        {items.length === 0 ? (
          <p>Your cart is empty</p>
        ) : (
          <>
            {items.map((item) => {
              const finalPrice = calculateDiscount(item.price, item.discount);
              return (
                <div key={item.id} className="cart-item">
                  <img src={item.image} alt={item.name} className="cart-item-image" />
                  <div className="cart-item-details">
                    <h3>{item.name}</h3>
                    <span className="item-type">{item.type === 'natural' ? '🌱 Natural Product' : '📦 Packaged'}</span>
                    <div className="price-info">
                      <span className="final-price">₹{finalPrice.toFixed(2)}</span>
                      {(item.discount > 0 || isFirstTimeUser) && (
                        <span className="original-price">₹{item.price}</span>
                      )}
                    </div>
                    <div className="quantity-controls">
                      <button onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}>-</button>
                      <span>{item.quantity}</span>
                      <button onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}>+</button>
                    </div>
                    <button onClick={() => onRemoveItem(item.id)} className="remove-btn">Remove</button>
                  </div>
                </div>
              );
            })}
            
            {hasNaturalProducts && (
              <div className="pre-order-section">
                <label className="pre-order-label">
                  <input
                    type="checkbox"
                    checked={isPreOrder}
                    onChange={(e) => handlePreOrderToggle(e.target.checked)}
                  /> 
                  <span>Pre-order Natural Products</span>
                </label>
                {isPreOrder && (
                  <DatePicker
                    selected={deliveryDate}
                    onChange={date => setDeliveryDate(date)}
                    minDate={new Date()}
                    placeholderText="Select delivery date"
                    className="date-picker"
                  />
                )}
              </div>
            )}

            <div className="cart-total">
              <h3>Total: ₹{total.toFixed(2)}</h3>
              {isFirstTimeUser && (
                <p className="first-time-discount">10% First Time User Discount Applied!</p>
              )}
              <button 
                onClick={handleCheckout} 
                className="checkout-btn"
                disabled={items.length === 0 || isCheckingOut}
              >
                {isCheckingOut ? 'Processing...' : 'Checkout'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Payment Selection Modal */}
      {showPaymentModal && (
        <div className="payment-modal">
          <div className="modal-content">
            <h2>Select Payment Method</h2>
            <div className="payment-options">
              <button 
                className="payment-option"
                onClick={() => handlePaymentSelection('card')}
              >
                💳 Card Payment
              </button>
              <button 
                className="payment-option"
                onClick={() => handlePaymentSelection('upi')}
              >
                📱 UPI Payment
              </button>
              <button 
                className="payment-option"
                onClick={() => handlePaymentSelection('cash')}
              >
                💵 Cash on Delivery
              </button>
            </div>
            <button 
              className="close-modal-btn"
              onClick={() => setShowPaymentModal(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Custom Modal */}
      {isModalOpen && (
        <div className="custom-modal">
          <div className="modal-content">
            <h2>Order Confirmation</h2>
            <p>{checkoutMessage}</p>
            <button onClick={closeModal} className="close-modal-btn">Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;