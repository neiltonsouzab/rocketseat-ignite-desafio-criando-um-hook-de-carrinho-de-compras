import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const prevCartRef = useRef<Product[]>();

  // useEffect(() => {
  //   localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
  // }, [cart]);

  useEffect(() => {
    prevCartRef.current = cart;
  });

  const cartPreviousValue = prevCartRef.current ?? cart
  
  useEffect(() => {
    if (cartPreviousValue !== cart) {
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
    }
  }, [cart, cartPreviousValue]);

  const addProduct = async (productId: number) => {
    try {
      let updatedCart = [...cart];

      const productExistsInCart = updatedCart.find(product => product.id === productId);

      const response = await api.get(`/stock/${productId}`);
      const stock = response.data;

      const stockAmount = stock.amount;
      const currentAmount = productExistsInCart ? productExistsInCart.amount : 0;
      const requestAmount = currentAmount + 1;

      if (requestAmount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (productExistsInCart) {
        productExistsInCart.amount = requestAmount;
      } else {
        const response = await api.get(`/products/${productId}`);

        const newProduct = {
          ...response.data,
          amount: requestAmount
        };

        updatedCart.push(newProduct);
      }

      setCart(updatedCart)
      // localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updatedCart = [...cart];
      const productIndex = updatedCart.findIndex(product => product.id === productId);

      if (productIndex <= 0) {
        throw new Error();
      }

      updatedCart.splice(productIndex, 1);

      setCart(updatedCart);
      // localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      const response = await api.get(`/stock/${productId}`);
      const stock = response.data;

      const stockAmount = stock.amount;
      const requestAmount = amount;

      if (requestAmount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const updatedCart = [...cart];
      const productCart = updatedCart.find(product => product.id === productId);

      if (!productCart) {
        throw new Error();
      }
      
      productCart.amount = requestAmount;

      setCart(updatedCart);
      // localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));

    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
