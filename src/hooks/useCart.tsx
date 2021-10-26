import { createContext, ReactNode, useContext, useState } from 'react';
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

  async function hasStock(amount: number, id: number): Promise<boolean> {
    const stock = (await api.get<Stock>(`stock/${id}`)).data;

    return stock.amount >= amount
  }

  function setChartData(newCart: Product[]){
    setCart(newCart)
    localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
  }

  const addProduct = async (productId: number) => {
    try {
      const idxFounded = cart.findIndex(product => product.id === productId);
      let tempCart = [...cart];

      if(idxFounded >= 0) {
        const product = Object.assign({}, tempCart[idxFounded]);

        product.amount = product.amount + 1;

        const validStock = await hasStock(product.amount, product.id);

        if (validStock) {
          tempCart[idxFounded] = product;
          setChartData(tempCart);
        } else {
          toast.error('Quantidade solicitada fora de estoque');
          return
        }
      } else {
        const product = (await api.get<Product>(`products/${productId}`)).data;
        product.amount = 1;
        tempCart = [...tempCart, product]
        setChartData(tempCart);
      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const idxFounded = cart.findIndex(product => product.id === productId);
      const tempCart = [...cart];

      if(idxFounded >= 0) {
        tempCart.splice(idxFounded, 1);

        setChartData(tempCart);
      } else {
        throw new Error('Product not found!')
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return

      const validStock = await hasStock(amount, productId);

      if (!validStock) {
        toast.error('Quantidade solicitada fora de estoque');
        return
      }

      const idxFounded = cart.findIndex(product => product.id === productId);
      let tempCart = [...cart];

      if(idxFounded >= 0) {
        const product = tempCart[idxFounded];

        product.amount = amount;

        tempCart[idxFounded] = product;
        setChartData(tempCart);
      }
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
