import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingBag, Search, Tag, Info, AlertTriangle, CheckCircle2, 
  ShoppingBag as BagIcon, Clock, ArrowLeft, Send, MapPin, Phone, 
  User, Check, AlertCircle, ShoppingCart, RefreshCw, X,
  Calculator, Barcode, Users, DollarSign, TrendingUp, Printer, FileText, Plus, Trash2, Edit3, ShieldCheck, Package, Layers, PieChart,
  Minus, Share2, Eye, SlidersHorizontal, ArrowUpDown, Filter, Sparkles, Copy, ZoomIn, Heart, Wallet, Truck
} from 'lucide-react';
import { StoreProduct, StoreOrder, Language, Supplier, Customer, ExpenseRecord, IncomeRecord, POSCartItem } from '../types';
import { collection, doc, onSnapshot, writeBatch, query, where, getDoc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';

interface StorePanelProps {
  lang: Language;
  walletBalance: number;
  isAdmin?: boolean;
}

export default function StorePanel({ lang, walletBalance, isAdmin = false }: StorePanelProps) {
  const isUserAdmin = isAdmin;
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Navigation tabs: browse | pos | inventory | suppliers | customers | expenses | reports | orders
  const [activeTab, setActiveTab] = useState<'browse' | 'pos' | 'inventory' | 'suppliers' | 'customers' | 'expenses' | 'reports' | 'orders'>('browse');

  // Checkout payment method selection ('Wallet' | 'COD')
  const [clientCartPaymentMethod, setClientCartPaymentMethod] = useState<'Wallet' | 'COD'>('Wallet');
  const [singleCheckoutPaymentMethod, setSingleCheckoutPaymentMethod] = useState<'Wallet' | 'COD'>('Wallet');

  // Filter & search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'newest' | 'price-asc' | 'price-desc' | 'stock-desc' | 'name-asc'>('newest');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [wishlist, setWishlist] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('store_wishlist') || '[]');
    } catch { return []; }
  });

  // Purchase flow states
  const [selectedProduct, setSelectedProduct] = useState<StoreProduct | null>(null);
  const [checkoutProduct, setCheckoutProduct] = useState<StoreProduct | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [orderNote, setOrderNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);

  // Online Shop Client Cart State
  const [clientCart, setClientCart] = useState<{ product: StoreProduct; quantity: number }[]>([]);
  const [showClientCart, setShowClientCart] = useState(false);
  const [viewingProduct, setViewingProduct] = useState<StoreProduct | null>(null);
  const [clientCartAddress, setClientCartAddress] = useState('');
  const [clientCartPhone, setClientCartPhone] = useState('');
  const [clientCartNote, setClientCartNote] = useState('');

  // POS Cart State
  const [posCart, setPosCart] = useState<POSCartItem[]>([]);
  const [posCustomerName, setPosCustomerName] = useState('');
  const [posCustomerPhone, setPosCustomerPhone] = useState('');
  const [posPaymentMethod, setPosPaymentMethod] = useState<'Cash' | 'bKash' | 'Card' | 'Due'>('Cash');
  const [posPaidAmount, setPosPaidAmount] = useState<number>(0);
  const [lastInvoice, setLastInvoice] = useState<any | null>(null);

  // Inventory & Management States
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [incomes, setIncomes] = useState<IncomeRecord[]>([]);
  
  // Modal states for adding/editing
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<StoreProduct | null>(null);
  const [productForm, setProductForm] = useState({
    title: '', titleBn: '', price: 0, stock: 0, description: '', descriptionBn: '', category: 'General', categoryBn: 'সাধারণ'
  });

  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [supplierForm, setSupplierForm] = useState({ companyName: '', contactPerson: '', phone: '', email: '', address: '', dueAmount: 0 });

  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerForm, setCustomerForm] = useState({ name: '', phone: '', email: '', address: '', dueAmount: 0, creditLimit: 10000 });

  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ title: '', category: 'Operational', amount: 0, note: '' });

  const currentUser = auth.currentUser;

  // Real-time subscribe to products
  useEffect(() => {
    const q = collection(db, 'products');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const prods: StoreProduct[] = [];
      snapshot.forEach((docSnap) => {
        prods.push({ id: docSnap.id, ...docSnap.data() } as StoreProduct);
      });
      setProducts(prods);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching products: ", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Real-time subscribe to store orders
  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, 'store_orders'), where('userId', '==', currentUser.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ords: StoreOrder[] = [];
      snapshot.forEach((docSnap) => {
        ords.push({ id: docSnap.id, ...docSnap.data() } as StoreOrder);
      });
      ords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setOrders(ords);
    }, (error) => {
      console.error("Error fetching user orders: ", error);
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Real-time suppliers & customers & expenses
  useEffect(() => {
    const unsubSup = onSnapshot(collection(db, 'suppliers'), (snap) => {
      const list: Supplier[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as Supplier));
      setSuppliers(list);
    }, () => {});

    const unsubCust = onSnapshot(collection(db, 'shop_customers'), (snap) => {
      const list: Customer[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as Customer));
      setCustomers(list);
    }, () => {});

    const unsubExp = onSnapshot(collection(db, 'shop_expenses'), (snap) => {
      const list: ExpenseRecord[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as ExpenseRecord));
      setExpenses(list);
    }, () => {});

    return () => {
      unsubSup();
      unsubCust();
      unsubExp();
    };
  }, []);

  // Order status update function
  const handleUpdateOrderStatus = async (orderId: string, newStatus: 'Approved' | 'Rejected') => {
    try {
      await updateDoc(doc(db, 'store_orders', orderId), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
      alert(lang === 'bn' ? `অর্ডারের স্ট্যাটাস '${newStatus}' আপডেট করা হয়েছে।` : `Order status updated to '${newStatus}'.`);
    } catch (err: any) {
      console.error("Error updating order status:", err);
      alert(lang === 'bn' ? "অর্ডার স্ট্যাটাস আপডেট ব্যর্থ হয়েছে" : "Failed to update order status");
    }
  };

  // Prefill phone on checkout
  useEffect(() => {
    if (checkoutProduct && currentUser) {
      setContactPhone('');
      const userDocRef = doc(db, 'registered_users', currentUser.uid);
      getDoc(userDocRef).then((snap) => {
        if (snap.exists() && snap.data().phone) {
          setContactPhone(snap.data().phone);
        }
      }).catch(() => {});
    }
  }, [checkoutProduct, currentUser]);

  // Prefill phone on client cart checkout
  useEffect(() => {
    if (showClientCart && currentUser) {
      setClientCartPhone('');
      const userDocRef = doc(db, 'registered_users', currentUser.uid);
      getDoc(userDocRef).then((snap) => {
        if (snap.exists() && snap.data().phone) {
          setClientCartPhone(snap.data().phone);
        }
      }).catch(() => {});
    }
  }, [showClientCart, currentUser]);

  const toggleWishlist = (productId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setWishlist(prev => {
      const next = prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId];
      localStorage.setItem('store_wishlist', JSON.stringify(next));
      return next;
    });
  };

  const categories = useMemo(() => {
    const catsSet = new Set<string>();
    products.forEach(p => {
      const c = p.category?.trim();
      if (c && c.toLowerCase() !== 'all') {
        catsSet.add(c);
      }
    });
    return ['All', ...Array.from(catsSet)];
  }, [products]);

  const getCategoryCount = (categoryName: string) => {
    if (categoryName === 'All') return products.length;
    return products.filter(p => p.category === categoryName).length;
  };

  const filteredProducts = useMemo(() => {
    let list = products.filter(p => {
      const title = (p.title || '').toLowerCase();
      const titleBn = (p.titleBn || '').toLowerCase();
      const desc = (p.description || '').toLowerCase();
      const descBn = (p.descriptionBn || '').toLowerCase();
      const cat = (p.category || '').toLowerCase();
      const q = searchQuery.trim().toLowerCase();

      const categoryMatch = selectedCategory === 'All' || p.category === selectedCategory;
      const searchMatch = !q || title.includes(q) || titleBn.includes(q) || desc.includes(q) || descBn.includes(q) || cat.includes(q);
      const stockMatch = !inStockOnly || p.stock > 0;

      return categoryMatch && searchMatch && stockMatch;
    });

    if (sortBy === 'price-asc') {
      list.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-desc') {
      list.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'stock-desc') {
      list.sort((a, b) => b.stock - a.stock);
    } else if (sortBy === 'name-asc') {
      list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    }
    return list;
  }, [products, selectedCategory, searchQuery, inStockOnly, sortBy]);

  const addToClientCart = (product: StoreProduct, qty: number = 1) => {
    if (product.stock <= 0) {
      alert(lang === 'bn' ? 'দুঃখিত, এই প্রোডাক্টটি আউট অফ স্টক!' : 'Sorry, this product is out of stock!');
      return;
    }
    setClientCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        const newQty = existing.quantity + qty;
        if (newQty > product.stock) {
          alert(lang === 'bn' ? `দুঃখিত, স্টকে মাত্র ${product.stock} টি প্রোডাক্ট রয়েছে!` : `Sorry, only ${product.stock} units are in stock!`);
          return prev;
        }
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: newQty } : item);
      }
      return [...prev, { product, quantity: qty }];
    });
  };

  const updateClientCartQty = (productId: string, delta: number) => {
    setClientCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQty = item.quantity + delta;
        if (newQty <= 0) return null;
        if (newQty > item.product.stock) {
          alert(lang === 'bn' ? 'স্টক লিমিটের বেশি যোগ করা যাবে না!' : 'Cannot exceed available stock!');
          return item;
        }
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter((item): item is { product: StoreProduct; quantity: number } => item !== null));
  };

  const handleClientCartCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || clientCart.length === 0) return;

    // Validate quantities & stock
    for (const item of clientCart) {
      if (item.product.stock < item.quantity) {
        alert(lang === 'bn' ? `দুঃখিত, ${item.product.title} এর পর্যাপ্ত স্টক নেই!` : `Sorry, ${item.product.title} has insufficient stock!`);
        return;
      }
    }

    const totalCost = clientCart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    if (clientCartPaymentMethod === 'Wallet' && walletBalance < totalCost) {
      alert(lang === 'bn' ? 'দুঃখিত, আপনার ওয়ালেট ব্যালেন্স অপর্যাপ্ত! ক্যাশ অন ডেলিভারি সিলেক্ট করুন অথবা ব্যালেন্স রিচার্জ করুন।' : 'Sorry, your wallet balance is insufficient! Select Cash on Delivery or add funds.');
      return;
    }

    if (!clientCartAddress.trim() || !clientCartPhone.trim()) {
      alert(lang === 'bn' ? 'ডেলিভারি ঠিকানা ও ফোন নম্বর প্রদান করুন!' : 'Please fill in delivery address and phone number!');
      return;
    }

    setIsSubmitting(true);
    const batch = writeBatch(db);
    const dateStr = new Date().toISOString();

    try {
      for (const item of clientCart) {
        const orderId = `order-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const subCost = item.product.price * item.quantity;

        const newOrder: StoreOrder = {
          id: orderId,
          productId: item.product.id,
          productTitle: item.product.title,
          productTitleBn: item.product.titleBn || item.product.title,
          price: item.product.price,
          quantity: item.quantity,
          totalPrice: subCost,
          date: dateStr,
          status: 'Pending',
          userId: currentUser.uid,
          userEmail: currentUser.email || 'unknown@user.com',
          userName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Customer',
          userPhone: clientCartPhone,
          deliveryAddress: clientCartAddress,
          note: `${clientCartPaymentMethod === 'COD' ? '[Cash on Delivery] ' : '[Wallet Paid] '}${clientCartNote || ''}`.trim()
        };

        batch.set(doc(db, 'store_orders', orderId), newOrder);

        const finalStock = Math.max(item.product.stock - item.quantity, 0);
        batch.update(doc(db, 'products', item.product.id), { stock: finalStock });

        const txId = `tx-store-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const storeTx = {
          id: txId,
          type: 'Voucher',
          amount: subCost,
          billerName: `Store: ${item.product.title} (x${item.quantity})`,
          billerNameBn: `স্টোর: ${item.product.titleBn || item.product.title} (x${item.quantity})`,
          date: dateStr,
          txId: orderId,
          status: clientCartPaymentMethod === 'COD' ? 'Pending' : 'Success',
          userId: currentUser.uid,
          userEmail: currentUser.email,
          note: `Method: ${clientCartPaymentMethod} | Phone: ${clientCartPhone} | Addr: ${clientCartAddress}`
        };
        batch.set(doc(db, 'users', currentUser.uid, 'transactions', txId), storeTx);
      }

      if (clientCartPaymentMethod === 'Wallet') {
        const newBalanceVal = Math.max(walletBalance - totalCost, 0);
        batch.set(doc(db, 'users', currentUser.uid, 'wallet', 'balance_doc'), { balance: newBalanceVal });
      }

      await batch.commit();
      setIsSubmitting(false);
      setClientCart([]);
      setClientCartAddress('');
      setClientCartNote('');
      setShowClientCart(false);
      setOrderSuccess(`cart-${Date.now()}`);
    } catch (err: any) {
      console.error("Cart checkout error:", err);
      alert(lang === 'bn' ? 'অর্ডার করতে সমস্যা হয়েছে: ' + err.message : 'Error placing order: ' + err.message);
      setIsSubmitting(false);
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !checkoutProduct) return;

    if (checkoutProduct.stock < quantity) {
      alert(lang === 'bn' ? 'দুঃখিত, পর্যাপ্ত স্টক নেই!' : 'Sorry, insufficient stock available!');
      return;
    }

    const totalCost = checkoutProduct.price * quantity;
    if (singleCheckoutPaymentMethod === 'Wallet' && walletBalance < totalCost) {
      alert(lang === 'bn' ? 'দুঃখিত, আপনার ব্যালেন্স অপর্যাপ্ত!' : 'Sorry, your wallet balance is insufficient!');
      return;
    }

    if (!deliveryAddress.trim() || !contactPhone.trim()) {
      alert(lang === 'bn' ? 'অনুগ্রহ করে ডেলিভারি ঠিকানা এবং ফোন নম্বর লিখুন!' : 'Please enter delivery address and phone number!');
      return;
    }

    setIsSubmitting(true);
    const newOrderId = `order-${Date.now()}`;
    const dateStr = new Date().toISOString();

    const newOrder: StoreOrder = {
      id: newOrderId,
      productId: checkoutProduct.id,
      productTitle: checkoutProduct.title,
      productTitleBn: checkoutProduct.titleBn,
      price: checkoutProduct.price,
      quantity: quantity,
      totalPrice: totalCost,
      date: dateStr,
      status: 'Pending',
      userId: currentUser.uid,
      userEmail: currentUser.email || 'unknown@user.com',
      userName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Customer',
      userPhone: contactPhone,
      deliveryAddress: deliveryAddress,
      note: `${singleCheckoutPaymentMethod === 'COD' ? '[Cash on Delivery] ' : '[Wallet Paid] '}${orderNote || ''}`.trim()
    };

    const batch = writeBatch(db);
    try {
      batch.set(doc(db, 'store_orders', newOrderId), newOrder);

      if (singleCheckoutPaymentMethod === 'Wallet') {
        const newBalanceVal = Math.max(walletBalance - totalCost, 0);
        batch.set(doc(db, 'users', currentUser.uid, 'wallet', 'balance_doc'), { balance: newBalanceVal });
      }

      const txId = `tx-store-${Date.now()}`;
      const storeTx = {
        id: txId,
        type: 'Voucher',
        amount: totalCost,
        billerName: `Store: ${checkoutProduct.title} (x${quantity})`,
        billerNameBn: `স্টোর: ${checkoutProduct.titleBn || checkoutProduct.title} (x${quantity})`,
        date: dateStr,
        txId: newOrderId,
        status: singleCheckoutPaymentMethod === 'COD' ? 'Pending' : 'Success',
        userId: currentUser.uid,
        userEmail: currentUser.email,
        note: `Method: ${singleCheckoutPaymentMethod} | Phone: ${contactPhone} | Addr: ${deliveryAddress}`
      };
      batch.set(doc(db, 'users', currentUser.uid, 'transactions', txId), storeTx);

      const finalStock = Math.max(checkoutProduct.stock - quantity, 0);
      batch.update(doc(db, 'products', checkoutProduct.id), { stock: finalStock });

      await batch.commit();
      setIsSubmitting(false);
      setCheckoutProduct(null);
      setOrderSuccess(newOrderId);
    } catch (err: any) {
      console.error("Order error:", err);
      alert(lang === 'bn' ? 'অর্ডার করতে সমস্যা হয়েছে: ' + err.message : 'Error placing order: ' + err.message);
      setIsSubmitting(false);
    }
  };

  // POS Cart Management
  const addToPosCart = (product: StoreProduct) => {
    if (product.stock <= 0) {
      alert(lang === 'bn' ? 'এই প্রোডাক্টটি স্টকে নেই!' : 'Product out of stock!');
      return;
    }
    setPosCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          alert(lang === 'bn' ? 'স্টক লিমিটের বেশি যোগ করা যাবে না!' : 'Cannot exceed available stock!');
          return prev;
        }
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product, quantity: 1, discount: 0 }];
    });
  };

  const updatePosQty = (productId: string, delta: number) => {
    setPosCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQty = item.quantity + delta;
        if (newQty <= 0) return null;
        if (newQty > item.product.stock) return item;
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter((item): item is POSCartItem => item !== null));
  };

  const posSubtotal = posCart.reduce((sum, item) => sum + (item.product.price * item.quantity) - item.discount, 0);

  const handleCompletePOS = async () => {
    if (posCart.length === 0) {
      alert(lang === 'bn' ? 'POS কার্ট খালি রয়েছে!' : 'POS cart is empty!');
      return;
    }
    const invoiceId = `INV-${Date.now()}`;
    const dateStr = new Date().toISOString();
    const invoiceData = {
      id: invoiceId,
      customerName: posCustomerName || 'Walk-in Customer',
      customerPhone: posCustomerPhone || 'N/A',
      items: posCart.map(i => ({ title: i.product.title, price: i.product.price, qty: i.quantity, total: i.product.price * i.quantity - i.discount })),
      totalAmount: posSubtotal,
      paymentMethod: posPaymentMethod,
      date: dateStr,
      cashier: currentUser?.displayName || currentUser?.email || 'Admin'
    };

    const batch = writeBatch(db);
    try {
      // Reduce stock for items in cart
      for (const item of posCart) {
        const newStock = Math.max(item.product.stock - item.quantity, 0);
        batch.update(doc(db, 'products', item.product.id), { stock: newStock });
      }
      // Save invoice
      batch.set(doc(db, 'shop_invoices', invoiceId), invoiceData);
      await batch.commit();

      setLastInvoice(invoiceData);
      setPosCart([]);
      setPosCustomerName('');
      setPosCustomerPhone('');
      alert(lang === 'bn' ? `বিক্রি সফল হয়েছে! ইনভয়েস আইডি: ${invoiceId}` : `Sale completed successfully! Invoice: ${invoiceId}`);
    } catch (err: any) {
      console.error("POS Checkout error:", err);
      alert('Error completing sale: ' + err.message);
    }
  };

  // Inventory Save Product
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const prodId = editingProduct ? editingProduct.id : `prod-${Date.now()}`;
    const productData = {
      title: productForm.title,
      titleBn: productForm.titleBn || productForm.title,
      price: Number(productForm.price),
      stock: Number(productForm.stock),
      description: productForm.description,
      descriptionBn: productForm.descriptionBn || productForm.description,
      category: productForm.category,
      categoryBn: productForm.categoryBn
    };

    try {
      await setDoc(doc(db, 'products', prodId), productData, { merge: true });
      setShowProductModal(false);
      setEditingProduct(null);
      setProductForm({ title: '', titleBn: '', price: 0, stock: 0, description: '', descriptionBn: '', category: 'General', categoryBn: 'সাধারণ' });
      alert(lang === 'bn' ? 'প্রোডাক্ট সফলভাবে সংরক্ষণ করা হয়েছে!' : 'Product saved successfully!');
    } catch (err: any) {
      alert('Error saving product: ' + err.message);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (window.confirm(lang === 'bn' ? 'আপনি কি এই প্রোডাক্টটি ডিলিট করতে চান?' : 'Are you sure you want to delete this product?')) {
      await deleteDoc(doc(db, 'products', id));
    }
  };

  // Save Supplier
  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    const supId = `sup-${Date.now()}`;
    await setDoc(doc(db, 'suppliers', supId), supplierForm);
    setShowSupplierModal(false);
    setSupplierForm({ companyName: '', contactPerson: '', phone: '', email: '', address: '', dueAmount: 0 });
  };

  // Save Customer
  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    const custId = `cust-${Date.now()}`;
    await setDoc(doc(db, 'shop_customers', custId), customerForm);
    setShowCustomerModal(false);
    setCustomerForm({ name: '', phone: '', email: '', address: '', dueAmount: 0, creditLimit: 10000 });
  };

  // Save Expense
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const expId = `exp-${Date.now()}`;
    const expData = {
      ...expenseForm,
      id: expId,
      amount: Number(expenseForm.amount),
      date: new Date().toISOString()
    };
    await setDoc(doc(db, 'shop_expenses', expId), expData);
    setShowExpenseModal(false);
    setExpenseForm({ title: '', category: 'Operational', amount: 0, note: '' });
  };

  const totalStoreSalesValue = orders.filter(o => o.status === 'Approved').reduce((s, o) => s + o.totalPrice, 0);
  const totalStockValue = products.reduce((s, p) => s + (p.price * p.stock), 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-6 pb-24 max-w-7xl mx-auto px-4 sm:px-6">
      {/* Shop Header & Navigation Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-[2.5rem] p-5 sm:p-6 text-white shadow-xl relative overflow-hidden border border-indigo-500/20">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-[10px] font-black uppercase px-3 py-1 rounded-full tracking-wider shadow-sm flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                {isUserAdmin ? (lang === 'bn' ? 'এটুজেড শপ ও পিওএস অ্যাডমিন' : 'A2Z Shop Admin Panel') : (lang === 'bn' ? 'নিহাদ অফিশিয়াল স্টোর' : 'NIHAD Official Store')}
              </span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" />
                {lang === 'bn' ? '১০০% অরিজিনাল প্রোডাক্ট' : '100% Genuine Guarantee'}
              </span>
            </div>
            <h1 className="text-xl sm:text-3xl font-black mt-2 tracking-tight">
              {isUserAdmin 
                ? (lang === 'bn' ? 'স্মার্ট শপ ম্যানেজমেন্ট ও পিওএস' : 'Smart Shop & POS Management')
                : (lang === 'bn' ? 'স্মার্ট গ্যাজেট ও টেক অ্যাক্সেসরিজ শপ' : 'Smart Gadgets & Electronics Store')}
            </h1>
            <p className="text-xs text-indigo-200/80 mt-1 max-w-xl font-medium">
              {isUserAdmin
                ? (lang === 'bn' ? 'ইনভেন্টরি, পিওএস কুইক বিলিং, কাস্টমার বাকির খাতা ও শপ রিপোর্ট পরিচালনা করুন।' : 'Manage inventory, POS billing, debtors ledger, expenses, and invoices in one seamless dashboard.')
                : (lang === 'bn' ? 'সেরা দামে অরিজিনাল গ্যাজেট ও টেক প্রোডাক্ট কিনুন। আপনার ওয়ালেট ব্যালেন্স অথবা ক্যাশ অন ডেলিভারিতে অর্ডার করুন।' : 'Shop authentic gadgets and electronics at best prices with Wallet Balance or Cash on Delivery.')}
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <div className="bg-indigo-950/60 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-indigo-500/20">
              <p className="text-[9.5px] text-indigo-300 font-extrabold uppercase tracking-wider">{lang === 'bn' ? 'ওয়ালেট ব্যালেন্স' : 'Wallet Balance'}</p>
              <p className="text-base sm:text-lg font-black text-emerald-400 font-mono">৳{walletBalance.toLocaleString()}</p>
            </div>
            <div className="bg-indigo-950/60 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-indigo-500/20">
              <p className="text-[9.5px] text-indigo-300 font-extrabold uppercase tracking-wider">{lang === 'bn' ? 'মোট প্রোডাক্টস' : 'Total Items'}</p>
              <p className="text-base sm:text-lg font-black text-white font-mono">{products.length}</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation Menu */}
        <div className="flex items-center gap-2 overflow-x-auto mt-6 pt-4 border-t border-white/10 scrollbar-none">
          {(isUserAdmin ? [
            { id: 'browse', label: lang === 'bn' ? 'অনলাইন শপ' : 'Online Shop', icon: ShoppingBag },
            { id: 'orders', label: lang === 'bn' ? 'অর্ডারসমূহ' : 'Store Orders', icon: Clock },
            { id: 'pos', label: lang === 'bn' ? 'POS টার্মিনাল' : 'POS Terminal', icon: Calculator },
            { id: 'inventory', label: lang === 'bn' ? 'স্টক ইনভেন্টরি' : 'Inventory', icon: Package },
            { id: 'suppliers', label: lang === 'bn' ? 'সাপ্লায়ার্স' : 'Suppliers', icon: Users },
            { id: 'customers', label: lang === 'bn' ? 'বাকির খাতা' : 'Debtors Ledger', icon: User },
            { id: 'expenses', label: lang === 'bn' ? 'খরচ ও আয়' : 'Expenses', icon: DollarSign },
            { id: 'reports', label: lang === 'bn' ? 'রিপোর্টস' : 'Reports', icon: TrendingUp },
          ] : [
            { id: 'browse', label: lang === 'bn' ? 'অনলাইন শপ' : 'Online Shop', icon: ShoppingBag },
            { id: 'orders', label: lang === 'bn' ? 'আমার অর্ডার' : 'My Orders', icon: Clock },
          ]).map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                  isActive 
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/30' 
                    : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: BROWSE ONLINE SHOP */}
      {activeTab === 'browse' && (
        <div className="space-y-6">
          {/* Controls Bar: Search, Category Pills with counts, Sort & In-Stock toggle */}
          <div className="space-y-4 bg-slate-900/60 border border-white/10 p-4 sm:p-5 rounded-[2rem] shadow-xl">
            <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder={lang === 'bn' ? 'প্রোডাক্টের নাম, বিবরণ বা ক্যাটাগরি দিয়ে খুঁজুন...' : 'Search products, description or category...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-10 py-2.5 bg-slate-950/60 border border-white/10 rounded-2xl text-xs font-semibold text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-3 top-3 text-slate-400 hover:text-slate-200 cursor-pointer">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Sort Dropdown */}
                <div className="flex items-center gap-1.5 bg-slate-950/60 border border-white/10 px-3 py-1.5 rounded-2xl">
                  <ArrowUpDown className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-transparent text-xs font-black text-slate-200 outline-none cursor-pointer"
                  >
                    <option value="newest" className="bg-slate-900">{lang === 'bn' ? 'সর্বশেষ প্রোডাক্ট' : 'Newest First'}</option>
                    <option value="price-asc" className="bg-slate-900">{lang === 'bn' ? 'কম দাম থেকে বেশি' : 'Price: Low to High'}</option>
                    <option value="price-desc" className="bg-slate-900">{lang === 'bn' ? 'বেশি দাম থেকে কম' : 'Price: High to Low'}</option>
                    <option value="stock-desc" className="bg-slate-900">{lang === 'bn' ? 'বেশি স্টক আগে' : 'In Stock First'}</option>
                    <option value="name-asc" className="bg-slate-900">{lang === 'bn' ? 'নাম অনুসারে (A-Z)' : 'Name (A-Z)'}</option>
                  </select>
                </div>

                {/* In Stock Only Switch */}
                <button
                  type="button"
                  onClick={() => setInStockOnly(!inStockOnly)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-black cursor-pointer transition-all border ${
                    inStockOnly 
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                      : 'bg-slate-950/60 text-slate-400 border-white/10 hover:text-slate-200'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${inStockOnly ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                  <span>{lang === 'bn' ? 'শুধুমাত্র স্টকে আছে' : 'In Stock Only'}</span>
                </button>
              </div>
            </div>

            {/* Dynamic Category Badges Bar */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none pt-2 border-t border-white/5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 shrink-0 mr-1 flex items-center gap-1">
                <Tag className="h-3 w-3 text-indigo-400" />
                {lang === 'bn' ? 'ক্যাটাগরি:' : 'Category:'}
              </span>
              {categories.map((cat, catIdx) => {
                const count = getCategoryCount(cat);
                const isSelected = selectedCategory === cat;
                return (
                  <button
                    key={`cat-${cat}-${catIdx}`}
                    onClick={() => setSelectedCategory(cat)}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl text-xs font-black cursor-pointer transition-all whitespace-nowrap ${
                      isSelected 
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 border-none' 
                        : 'bg-slate-950/60 hover:bg-slate-950 text-slate-300 border border-white/5'
                    }`}
                  >
                    <span>{cat}</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-white/5 text-slate-400'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Grid Header stats */}
          <div className="flex justify-between items-center px-1">
            <p className="text-xs font-black text-slate-400 flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              <span>
                {lang === 'bn' 
                  ? `${filteredProducts.length} টি প্রোডাক্ট পাওয়া গেছে` 
                  : `Showing ${filteredProducts.length} Products`}
              </span>
            </p>
            {(selectedCategory !== 'All' || searchQuery || inStockOnly) && (
              <button
                onClick={() => { setSelectedCategory('All'); setSearchQuery(''); setInStockOnly(false); }}
                className="text-xs font-black text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
              >
                <X className="h-3 w-3" />
                <span>{lang === 'bn' ? 'ফিল্টার মুছুন' : 'Reset Filters'}</span>
              </button>
            )}
          </div>

          {loading ? (
            <div className="text-center py-20">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-indigo-500" />
              <p className="text-xs text-slate-400 mt-2 font-semibold">{lang === 'bn' ? 'প্রোডাক্ট লোড হচ্ছে...' : 'Loading products...'}</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="bg-slate-900/40 rounded-[2rem] border border-white/5 p-12 text-center shadow-xl space-y-3">
              <ShoppingBag className="h-12 w-12 text-slate-600 mx-auto" />
              <p className="text-sm font-bold text-slate-400">{lang === 'bn' ? 'কোনো প্রোডাক্ট পাওয়া যায়নি' : 'No products found'}</p>
              <button
                onClick={() => { setSelectedCategory('All'); setSearchQuery(''); setInStockOnly(false); }}
                className="px-4 py-2 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 border border-indigo-500/30 rounded-xl text-xs font-black cursor-pointer"
              >
                {lang === 'bn' ? 'সব প্রোডাক্ট দেখুন' : 'Show All Products'}
              </button>
            </div>
          ) : (
            /* 4-COLUMN RESPONSIVE GRID LAYOUT */
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {filteredProducts.map((product, pIdx) => {
                const isWished = wishlist.includes(product.id);
                return (
                  <motion.div
                    key={`${product.id || 'p'}-${pIdx}`}
                    whileHover={{ y: -5 }}
                    onClick={() => setViewingProduct(product)}
                    className="bg-slate-900/50 hover:bg-slate-900/90 border border-white/5 hover:border-indigo-500/30 rounded-[2rem] p-4 sm:p-5 shadow-xl flex flex-col justify-between group transition-all duration-300 relative overflow-hidden cursor-pointer"
                  >
                    <div>
                      {/* Product Image Container */}
                      <div className="aspect-square bg-slate-950/80 rounded-2xl flex items-center justify-center relative overflow-hidden mb-3.5 border border-white/5 group">
                        {product.imageUrl ? (
                          <img 
                            src={product.imageUrl} 
                            alt={product.title} 
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500" 
                          />
                        ) : (
                          <ShoppingBag className="h-12 w-12 text-slate-700" />
                        )}
                        
                        {/* Overlay badge on hover */}
                        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <span className="p-2.5 bg-slate-900/90 hover:bg-indigo-600 text-white rounded-full shadow-lg transition-transform active:scale-90 flex items-center justify-center">
                            <Eye className="h-4 w-4" />
                          </span>
                        </div>

                        {/* Stock Badge */}
                        <span className={`absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase border backdrop-blur-md ${
                          product.stock > 0 
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                            : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                        }`}>
                          {product.stock > 0 ? `${product.stock} in stock` : 'Out of Stock'}
                        </span>

                        {/* Bookmark/Wishlist button */}
                        <button
                          type="button"
                          onClick={(e) => toggleWishlist(product.id, e)}
                          className="absolute top-2.5 left-2.5 p-1.5 bg-slate-950/60 hover:bg-slate-900 text-white rounded-full border border-white/10 backdrop-blur-md cursor-pointer transition-transform active:scale-90"
                        >
                          <Heart className={`h-3.5 w-3.5 ${isWished ? 'fill-rose-500 text-rose-500' : 'text-slate-400'}`} />
                        </button>
                      </div>

                      {/* Category Pill */}
                      <div className="flex items-center justify-between">
                        <span className="text-[9.5px] font-black text-indigo-400 uppercase tracking-wider bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
                          {product.category || 'General'}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="text-xs sm:text-sm font-black text-slate-100 mt-2 line-clamp-1 group-hover:text-indigo-300 transition-colors">
                        {lang === 'bn' ? (product.titleBn || product.title) : product.title}
                      </h3>

                      {/* Description preview */}
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-snug">
                        {lang === 'bn' ? (product.descriptionBn || product.description) : product.description}
                      </p>
                    </div>

                    {/* Price and Cart Action Buttons */}
                    <div className="mt-4 pt-3 border-t border-white/5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                      <div>
                        <p className="text-[9px] text-slate-500 font-bold uppercase">{lang === 'bn' ? 'মূল্য' : 'Price'}</p>
                        <p className="text-sm sm:text-base font-black text-emerald-400">৳{product.price.toLocaleString()}</p>
                      </div>

                      <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => addToClientCart(product, 1)}
                          disabled={product.stock <= 0}
                          className="bg-white/5 hover:bg-white/10 disabled:opacity-50 text-slate-200 border border-white/10 p-2 rounded-xl transition-all cursor-pointer active:scale-95 flex-1 sm:flex-initial flex items-center justify-center"
                          title={lang === 'bn' ? 'কার্টে যোগ করুন' : 'Add to Cart'}
                        >
                          <ShoppingCart className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => { setQuantity(1); setCheckoutProduct(product); }}
                          disabled={product.stock <= 0}
                          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer active:scale-95 shadow-lg shadow-indigo-600/20 flex-1 sm:flex-initial flex items-center justify-center gap-1"
                        >
                          <ShoppingBag className="h-3.5 w-3.5" />
                          <span>{lang === 'bn' ? 'কিনুন' : 'Buy Now'}</span>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Glowing floating Shopping Cart trigger */}
          {clientCart.length > 0 && (
            <motion.button
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileHover={{ scale: 1.05 }}
              onClick={() => setShowClientCart(true)}
              className="fixed bottom-6 right-6 z-40 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-4 rounded-full shadow-2xl flex items-center gap-3 cursor-pointer border border-emerald-500/20 active:scale-95"
            >
              <div className="relative">
                <ShoppingCart className="h-6 w-6" />
                <span className="absolute -top-3 -right-3 bg-rose-600 text-white text-[10px] font-black h-5 w-5 rounded-full flex items-center justify-center border-2 border-emerald-600">
                  {clientCart.reduce((total, item) => total + item.quantity, 0)}
                </span>
              </div>
              <span className="text-xs font-black uppercase tracking-wider">{lang === 'bn' ? 'কার্ট দেখুন' : 'View Cart'}</span>
            </motion.button>
          )}
        </div>
      )}

      {/* TAB 2: POS TERMINAL */}
      {activeTab === 'pos' && isUserAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Product Picker */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Calculator className="h-5 w-5 text-indigo-600" />
                <span>{lang === 'bn' ? 'POS প্রোডাক্ট ক্যাটালগ' : 'POS Product Catalog'}</span>
              </h3>
              <div className="relative w-48">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Scan / Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 rounded-xl text-xs font-semibold border-none"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto pr-1">
              {filteredProducts.map((p, pIdx) => (
                <div
                  key={`pos-prod-${p.id || 'p'}-${pIdx}`}
                  onClick={() => addToPosCart(p)}
                  className="bg-slate-50 hover:bg-indigo-50/50 border border-slate-100 hover:border-indigo-200 p-3 rounded-2xl cursor-pointer transition-all flex flex-col justify-between"
                >
                  <div>
                    <p className="text-xs font-black text-slate-800 line-clamp-1">{p.title}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Stock: {p.stock}</p>
                  </div>
                  <div className="mt-3 flex justify-between items-center">
                    <span className="text-xs font-black text-indigo-600">৳{p.price}</span>
                    <span className="bg-indigo-600 text-white p-1.5 rounded-xl text-xs"><Plus className="h-3 w-3" /></span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* POS Cart & Checkout */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2 mb-4">
                <ShoppingCart className="h-5 w-5 text-indigo-600" />
                <span>{lang === 'bn' ? 'বর্তমান কার্ট (POS)' : 'Current POS Cart'}</span>
              </h3>

              <div className="space-y-3 mb-4">
                <input
                  type="text"
                  placeholder={lang === 'bn' ? 'গ্রাহকের নাম (ঐচ্ছিক)' : 'Customer Name (Optional)'}
                  value={posCustomerName}
                  onChange={(e) => setPosCustomerName(e.target.value)}
                  className="w-full bg-slate-50 border-none rounded-xl p-2.5 text-xs font-semibold"
                />
                <input
                  type="tel"
                  placeholder={lang === 'bn' ? 'গ্রাহকের ফোন নম্বর' : 'Customer Phone Number'}
                  value={posCustomerPhone}
                  onChange={(e) => setPosCustomerPhone(e.target.value)}
                  className="w-full bg-slate-50 border-none rounded-xl p-2.5 text-xs font-semibold"
                />
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {posCart.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-8">{lang === 'bn' ? 'কার্ট খালি আছে' : 'Cart is empty'}</p>
                ) : (
                  posCart.map((item, itemIdx) => (
                    <div key={`pos-cart-${item.product.id || 'item'}-${itemIdx}`} className="bg-slate-50 p-3 rounded-2xl flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-800 line-clamp-1">{item.product.title}</p>
                        <p className="text-[10px] text-indigo-600 font-semibold">৳{item.product.price} × {item.quantity}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => updatePosQty(item.product.id, -1)} className="w-6 h-6 bg-white rounded-lg shadow-sm font-bold text-xs flex items-center justify-center">-</button>
                        <span className="text-xs font-black w-5 text-center">{item.quantity}</span>
                        <button onClick={() => updatePosQty(item.product.id, 1)} className="w-6 h-6 bg-white rounded-lg shadow-sm font-bold text-xs flex items-center justify-center">+</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                <span>{lang === 'bn' ? 'পেমেন্ট মাধ্যম:' : 'Payment Method:'}</span>
                <select
                  value={posPaymentMethod}
                  onChange={(e: any) => setPosPaymentMethod(e.target.value)}
                  className="bg-slate-50 rounded-xl px-3 py-1.5 text-xs font-black border-none"
                >
                  <option value="Cash">Cash (নগদ)</option>
                  <option value="bKash">bKash / Nagad</option>
                  <option value="Card">Card</option>
                  <option value="Due">Due Sale (বাকি)</option>
                </select>
              </div>

              <div className="flex justify-between items-center text-base font-black text-slate-900 bg-indigo-50 p-3 rounded-2xl">
                <span>{lang === 'bn' ? 'সর্বমোট প্রদেয়:' : 'Total Payable:'}</span>
                <span className="text-indigo-600">৳{posSubtotal.toLocaleString()}</span>
              </div>

              <button
                onClick={handleCompletePOS}
                disabled={posCart.length === 0}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-3 rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-500/10 cursor-pointer active:scale-95"
              >
                <Printer className="h-4 w-4" />
                <span>{lang === 'bn' ? 'বিল ও প্রিন্ট করুন' : 'Complete & Print Invoice'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: INVENTORY & STOCK */}
      {activeTab === 'inventory' && isUserAdmin && (
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Package className="h-5 w-5 text-indigo-600" />
              <span>{lang === 'bn' ? 'স্টক ও প্রোডাক্ট ইনভেন্টরি' : 'Stock & Product Inventory'}</span>
            </h3>
            <button
              onClick={() => {
                setEditingProduct(null);
                setProductForm({ title: '', titleBn: '', price: 0, stock: 0, description: '', descriptionBn: '', category: 'General', categoryBn: 'সাধারণ' });
                setShowProductModal(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>{lang === 'bn' ? 'নতুন প্রোডাক্ট যোগ করুন' : 'Add New Product'}</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] uppercase font-black text-slate-400">
                  <th className="py-3 px-4">{lang === 'bn' ? 'প্রোডাক্টের নাম' : 'Product Name'}</th>
                  <th className="py-3 px-4">{lang === 'bn' ? 'ক্যাটাগরি' : 'Category'}</th>
                  <th className="py-3 px-4">{lang === 'bn' ? 'মূল্য' : 'Price'}</th>
                  <th className="py-3 px-4">{lang === 'bn' ? 'স্টক' : 'Stock'}</th>
                  <th className="py-3 px-4 text-right">{lang === 'bn' ? 'অ্যাকশন' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {products.map((p, pIdx) => (
                  <tr key={`inv-p-${p.id || 'p'}-${pIdx}`} className="hover:bg-slate-50/50">
                    <td className="py-3.5 px-4 font-bold text-slate-900">{p.title}</td>
                    <td className="py-3.5 px-4"><span className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full text-[10px] font-black">{p.category || 'General'}</span></td>
                    <td className="py-3.5 px-4 font-mono font-black text-indigo-600">৳{p.price.toLocaleString()}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${p.stock > 5 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {p.stock} units
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => {
                          setEditingProduct(p);
                          setProductForm({ title: p.title, titleBn: p.titleBn || '', price: p.price, stock: p.stock, description: p.description || '', descriptionBn: p.descriptionBn || '', category: p.category || 'General', categoryBn: p.categoryBn || 'সাধারণ' });
                          setShowProductModal(true);
                        }}
                        className="p-2 bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-600 rounded-xl inline-flex items-center justify-center cursor-pointer"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(p.id)}
                        className="p-2 bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-600 rounded-xl inline-flex items-center justify-center cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: SUPPLIERS */}
      {activeTab === 'suppliers' && isUserAdmin && (
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-600" />
              <span>{lang === 'bn' ? 'সাপ্লায়ার ম্যানেজমেন্ট' : 'Supplier Management'}</span>
            </h3>
            <button
              onClick={() => setShowSupplierModal(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>{lang === 'bn' ? 'সাপ্লায়ার যোগ করুন' : 'Add Supplier'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {suppliers.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center col-span-full">{lang === 'bn' ? 'কোনো সাপ্লায়ার নেই' : 'No suppliers added yet'}</p>
            ) : (
              suppliers.map((s, sIdx) => (
                <div key={`sup-${s.id || 's'}-${sIdx}`} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                  <h4 className="text-sm font-black text-slate-900">{s.companyName}</h4>
                  <p className="text-xs text-slate-500 font-semibold">Contact: {s.contactPerson} ({s.phone})</p>
                  <p className="text-xs text-slate-400">Email: {s.email || 'N/A'}</p>
                  <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Due Balance</span>
                    <span className="text-xs font-black text-rose-600">৳{s.dueAmount.toLocaleString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 5: CUSTOMERS */}
      {activeTab === 'customers' && isUserAdmin && (
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-6">
          <div className="flex justify-between items-center flex-wrap gap-3">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <User className="h-5 w-5 text-indigo-600" />
                <span>{lang === 'bn' ? 'কাস্টমার বাকির খাতা ও লেজার' : 'Customer Bakir Khata & Due Ledger'}</span>
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {lang === 'bn' ? 'কাস্টমারের পাওনা বাকি হিসাব ও পেমেন্ট রিমাইন্ডার মেসেজ পাঠান' : 'Track customer debts, collect partial dues, and send payment reminders'}
              </p>
            </div>
            <button
              onClick={() => setShowCustomerModal(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-sm transition-all active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>{lang === 'bn' ? 'নতুন কাস্টমার যোগ' : 'Add Customer'}</span>
            </button>
          </div>

          {/* Due Summary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase text-rose-600">{lang === 'bn' ? 'মোট মার্কেট বাকি (Total Market Due)' : 'Total Outstanding Due'}</p>
                <p className="text-xl font-black text-rose-900 mt-1 font-mono">
                  ৳{customers.reduce((acc, curr) => acc + (curr.dueAmount || 0), 0).toLocaleString()}
                </p>
              </div>
              <span className="p-3 bg-rose-100 text-rose-600 rounded-xl font-black text-xs">
                {customers.filter(c => c.dueAmount > 0).length} {lang === 'bn' ? 'জন বাকাদার' : 'Debtors'}
              </span>
            </div>

            <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase text-indigo-600">{lang === 'bn' ? 'মোট নিবন্ধিত কাস্টমার' : 'Total Customers'}</p>
                <p className="text-xl font-black text-indigo-900 mt-1 font-mono">
                  {customers.length}
                </p>
              </div>
              <span className="p-3 bg-indigo-100 text-indigo-600 rounded-xl font-black text-xs">
                Active Ledger
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {customers.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center col-span-full">{lang === 'bn' ? 'কোনো কাস্টমার বা বাকির খাতা নেই' : 'No customer due records found'}</p>
            ) : (
              customers.map((c, cIdx) => (
                <div key={`cust-${c.id || 'c'}-${cIdx}`} className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3 shadow-xs hover:border-indigo-300 transition-all">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-sm font-black text-slate-900">{c.name}</h4>
                      <p className="text-xs text-slate-600 font-mono font-bold mt-0.5">📞 {c.phone}</p>
                      {c.address && <p className="text-[11px] text-slate-500 mt-0.5">📍 {c.address}</p>}
                    </div>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${c.dueAmount > 0 ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'}`}>
                      {c.dueAmount > 0 ? (lang === 'bn' ? 'বাকি আছে' : 'Due Pending') : (lang === 'bn' ? 'পরিশোধিত' : 'Paid')}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                    <span className="text-[10px] font-extrabold text-slate-500 uppercase">{lang === 'bn' ? 'বাকি টাকা:' : 'Due Amount:'}</span>
                    <span className="text-sm font-black text-rose-600 font-mono">৳{c.dueAmount.toLocaleString()}</span>
                  </div>

                  {/* Bakir Khata Action Buttons */}
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        const amountStr = prompt(lang === 'bn' ? `${c.name} এর কাছ থেকে কত টাকা বাকি জমা পেয়েছেন?` : `Enter payment collected from ${c.name}:`, c.dueAmount.toString());
                        if (amountStr) {
                          const collected = parseFloat(amountStr);
                          if (!isNaN(collected) && collected > 0) {
                            setCustomers(prev => prev.map(item => item.id === c.id ? { ...item, dueAmount: Math.max(0, item.dueAmount - collected) } : item));
                            alert(lang === 'bn' ? `✅ ${c.name} এর ৳${collected} বাকি টাকা জমা সম্পন্ন হয়েছে!` : `✅ Collected ৳${collected} from ${c.name}!`);
                          }
                        }
                      }}
                      className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-bold transition-all text-center cursor-pointer active:scale-95 shadow-xs"
                    >
                      {lang === 'bn' ? 'বাকি জমা নিন' : 'Collect Due'}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const msg = `সম্মানিত কাস্টমার ${c.name}, NIHAD BUSINESS POINT এর পক্ষ থেকে জানানো যাচ্ছে যে আপনার নিকট ৳${c.dueAmount} বাকি রয়েছে। অনুগ্রহ করে বকেয়া টাকা পরিশোধ করার জন্য অনুরোধ করা হচ্ছে। ধন্যবাদ!`;
                        window.open(`https://wa.me/88${c.phone}?text=${encodeURIComponent(msg)}`, '_blank');
                      }}
                      className="py-1.5 px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-bold transition-all text-center cursor-pointer active:scale-95 shadow-xs flex items-center gap-1"
                    >
                      <span>{lang === 'bn' ? 'রিমাইন্ডার' : 'SMS Alert'}</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 6: EXPENSES & INCOME */}
      {activeTab === 'expenses' && isUserAdmin && (
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-indigo-600" />
              <span>{lang === 'bn' ? 'দোকানের খরচ ও আয় ব্যবস্থাপনা' : 'Shop Expenses & Income Management'}</span>
            </h3>
            <button
              onClick={() => setShowExpenseModal(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>{lang === 'bn' ? 'খরচ যোগ করুন' : 'Add Expense'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-indigo-50 p-4 rounded-2xl">
              <p className="text-[10px] font-bold text-indigo-600 uppercase">{lang === 'bn' ? 'মোট খরচ' : 'Total Expenses'}</p>
              <p className="text-xl font-black text-indigo-900 mt-1">৳{totalExpenses.toLocaleString()}</p>
            </div>
            <div className="bg-emerald-50 p-4 rounded-2xl">
              <p className="text-[10px] font-bold text-emerald-600 uppercase">{lang === 'bn' ? 'মোট বিক্রয় আয়' : 'Total Sales Revenue'}</p>
              <p className="text-xl font-black text-emerald-900 mt-1">৳{totalStoreSalesValue.toLocaleString()}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl">
              <p className="text-[10px] font-bold text-slate-500 uppercase">{lang === 'bn' ? 'নীট লাভ' : 'Net Cashflow'}</p>
              <p className="text-xl font-black text-slate-900 mt-1">৳{(totalStoreSalesValue - totalExpenses).toLocaleString()}</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] uppercase font-black text-slate-400">
                  <th className="py-3 px-4">{lang === 'bn' ? 'বিবরণ' : 'Description'}</th>
                  <th className="py-3 px-4">{lang === 'bn' ? 'ক্যাটাগরি' : 'Category'}</th>
                  <th className="py-3 px-4">{lang === 'bn' ? 'পরিমাণ' : 'Amount'}</th>
                  <th className="py-3 px-4">{lang === 'bn' ? 'তারিখ' : 'Date'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {expenses.map((e, eIdx) => (
                  <tr key={`exp-${e.id || 'e'}-${eIdx}`}>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{e.title}</td>
                    <td className="py-3.5 px-4"><span className="bg-rose-50 text-rose-700 px-2.5 py-1 rounded-full text-[10px] font-black">{e.category}</span></td>
                    <td className="py-3.5 px-4 font-mono font-black text-rose-600">৳{e.amount.toLocaleString()}</td>
                    <td className="py-3.5 px-4 text-slate-400">{new Date(e.date).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 7: REPORTS */}
      {activeTab === 'reports' && isUserAdmin && (
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-6">
          <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-indigo-600" />
            <span>{lang === 'bn' ? 'দোকানের মাসিক ও দৈনিক রিপোর্ট' : 'Shop Financial & Sales Reports'}</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-50 p-6 rounded-3xl space-y-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">{lang === 'bn' ? 'বিক্রি ও ইনভেন্টরি সারাংশ' : 'Sales & Inventory Summary'}</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs font-bold text-slate-700 bg-white p-3 rounded-2xl shadow-sm">
                  <span>{lang === 'bn' ? 'অনুমোদিত মোট অর্ডার' : 'Approved Orders'}</span>
                  <span className="font-black text-indigo-600">{orders.filter(o => o.status === 'Approved').length}</span>
                </div>
                <div className="flex justify-between items-center text-xs font-bold text-slate-700 bg-white p-3 rounded-2xl shadow-sm">
                  <span>{lang === 'bn' ? 'মোট স্টক ভ্যালু' : 'Total Stock Valuation'}</span>
                  <span className="font-black text-emerald-600">৳{totalStockValue.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-6 rounded-3xl space-y-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">{lang === 'bn' ? 'লাভ ও ক্ষতি হিসাব' : 'Profit & Loss Statement'}</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs font-bold text-slate-700 bg-white p-3 rounded-2xl shadow-sm">
                  <span>{lang === 'bn' ? 'মোট আয়' : 'Total Revenue'}</span>
                  <span className="font-black text-emerald-600">৳{totalStoreSalesValue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-xs font-bold text-slate-700 bg-white p-3 rounded-2xl shadow-sm">
                  <span>{lang === 'bn' ? 'মোট খরচ' : 'Total Expenses'}</span>
                  <span className="font-black text-rose-600">৳{totalExpenses.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 8: MY ORDERS / STORE ORDERS */}
      {activeTab === 'orders' && (
        <div className="bg-slate-900/60 border border-white/10 rounded-[2rem] p-6 space-y-6 text-slate-100 shadow-xl">
          <div className="flex justify-between items-center border-b border-white/5 pb-4 flex-wrap gap-2">
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Clock className="h-5 w-5 text-indigo-400" />
                <span>{isUserAdmin ? (lang === 'bn' ? 'কাস্টমারদের শপ অর্ডারসমূহ' : 'Customer Store Orders') : (lang === 'bn' ? 'আমার শপ অর্ডার ইতিহাস' : 'My Store Order History')}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {lang === 'bn' ? 'অর্ডারের লাইভ ডেলিভারি স্ট্যাটাস, অ্যাড্রেস ও আইডি ট্র্যাকিং' : 'Track live status and delivery timeline for your store orders'}
              </p>
            </div>
            <span className="bg-indigo-500/10 text-indigo-400 font-extrabold text-xs px-3 py-1 rounded-full border border-indigo-500/20">
              {orders.length} {lang === 'bn' ? 'টি অর্ডার' : 'Total Orders'}
            </span>
          </div>

          <div className="space-y-4">
            {orders.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-white/10 rounded-3xl space-y-3">
                <ShoppingBag className="h-10 w-10 text-slate-500 mx-auto" />
                <p className="text-xs font-bold text-slate-400">{lang === 'bn' ? 'কোনো শপ অর্ডার পাওয়া যায়নি।' : 'No store orders placed yet.'}</p>
                <button
                  onClick={() => setActiveTab('browse')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-xl transition-all shadow-md cursor-pointer"
                >
                  {lang === 'bn' ? 'অনলাইন শপে প্রোডাক্টস দেখুন' : 'Browse Products Now'}
                </button>
              </div>
            ) : (
              orders.map((order, oIdx) => {
                const isPending = order.status === 'Pending';
                const isApproved = order.status === 'Approved';
                const isRejected = order.status === 'Rejected';

                return (
                  <div 
                    key={`ord-${order.id || 'o'}-${oIdx}`} 
                    className="bg-slate-950/60 border border-white/10 rounded-3xl p-5 space-y-4 hover:border-indigo-500/30 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/5 pb-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-mono text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
                            ID: {order.id}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            📅 {new Date(order.date).toLocaleString()}
                          </span>
                        </div>
                        <h4 className="text-sm font-black text-white mt-1.5">
                          {lang === 'bn' ? (order.productTitleBn || order.productTitle) : order.productTitle}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full tracking-wider border ${
                          isApproved ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' :
                          isRejected ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' : 
                          'bg-amber-500/15 text-amber-400 border-amber-500/30 animate-pulse'
                        }`}>
                          {isApproved ? (lang === 'bn' ? 'অনুমোদিত / ডেলিভারড' : 'Approved / Delivered') :
                           isRejected ? (lang === 'bn' ? 'বাতিল' : 'Cancelled') : 
                           (lang === 'bn' ? 'প্রসেসিং / পন্ডিং' : 'Processing')}
                        </span>

                        {isUserAdmin && isPending && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleUpdateOrderStatus(order.id, 'Approved')}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-black transition-all cursor-pointer"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleUpdateOrderStatus(order.id, 'Rejected')}
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[10px] font-black transition-all cursor-pointer"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Order Details Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-900/50 p-3.5 rounded-2xl border border-white/5">
                      <div>
                        <span className="text-[9.5px] font-extrabold text-slate-400 uppercase font-mono block">{lang === 'bn' ? 'পরিমাণ' : 'Quantity'}</span>
                        <span className="font-bold text-slate-200 mt-0.5 block">{order.quantity} Pcs</span>
                      </div>
                      <div>
                        <span className="text-[9.5px] font-extrabold text-slate-400 uppercase font-mono block">{lang === 'bn' ? 'একক মূল্য' : 'Unit Price'}</span>
                        <span className="font-mono font-bold text-slate-200 mt-0.5 block">৳{order.price.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[9.5px] font-extrabold text-slate-400 uppercase font-mono block">{lang === 'bn' ? 'মোট মূল্য' : 'Total Price'}</span>
                        <span className="font-mono font-black text-emerald-400 mt-0.5 block">৳{order.totalPrice.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[9.5px] font-extrabold text-slate-400 uppercase font-mono block">{lang === 'bn' ? 'ডেলিভারি ঠিকানা' : 'Address'}</span>
                        <span className="font-semibold text-slate-300 mt-0.5 block truncate max-w-[150px]">{order.deliveryAddress || 'N/A'}</span>
                      </div>
                    </div>

                    {/* Order Progress Timeline */}
                    <div className="pt-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono">{lang === 'bn' ? 'ডেলিভারি ট্র্যাকিং স্ট্যাটাস:' : 'Delivery Progress Timeline:'}</p>
                      <div className="grid grid-cols-4 gap-1.5 text-center text-[9px] font-black uppercase font-mono">
                        <div className={`p-1.5 rounded-xl border ${!isRejected ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/30' : 'bg-white/5 text-slate-500 border-white/5'}`}>
                          1. Order Placed
                        </div>
                        <div className={`p-1.5 rounded-xl border ${isApproved || isPending ? 'bg-amber-600/20 text-amber-300 border-amber-500/30' : 'bg-white/5 text-slate-500 border-white/5'}`}>
                          2. Processing
                        </div>
                        <div className={`p-1.5 rounded-xl border ${isApproved ? 'bg-blue-600/20 text-blue-300 border-blue-500/30' : 'bg-white/5 text-slate-500 border-white/5'}`}>
                          3. Shipping
                        </div>
                        <div className={`p-1.5 rounded-xl border ${isApproved ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/30' : 'bg-white/5 text-slate-500 border-white/5'}`}>
                          4. Delivered
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* PRODUCT DETAILS MODAL */}
      <AnimatePresence>
        {viewingProduct && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-6 w-full max-w-2xl shadow-2xl space-y-6 text-white my-8 relative">
              <div className="flex justify-between items-start pb-4 border-b border-white/10">
                <div>
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-wider bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20">{viewingProduct.category || 'General'}</span>
                  <h3 className="text-lg sm:text-xl font-black text-slate-100 mt-2">{lang === 'bn' ? (viewingProduct.titleBn || viewingProduct.title) : viewingProduct.title}</h3>
                  {viewingProduct.titleBn && viewingProduct.title && viewingProduct.titleBn !== viewingProduct.title && (
                    <p className="text-xs text-slate-400 font-medium">{viewingProduct.title}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2000);
                    }}
                    className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full cursor-pointer transition-colors"
                    title={lang === 'bn' ? 'লিঙ্ক কপি করুন' : 'Copy link'}
                  >
                    {copiedLink ? <Check className="h-4 w-4 text-emerald-400" /> : <Share2 className="h-4 w-4" />}
                  </button>
                  <button onClick={() => setViewingProduct(null)} className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full cursor-pointer transition-colors"><X className="h-5 w-5" /></button>
                </div>
              </div>

              {copiedLink && (
                <div className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{lang === 'bn' ? 'প্রোডাক্ট লিঙ্ক কপি করা হয়েছে!' : 'Product link copied to clipboard!'}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div 
                  onClick={() => viewingProduct.imageUrl && setLightboxImage(viewingProduct.imageUrl)}
                  className="aspect-square bg-slate-950 rounded-3xl flex items-center justify-center overflow-hidden border border-white/5 relative group cursor-pointer"
                >
                  {viewingProduct.imageUrl ? (
                    <>
                      <img src={viewingProduct.imageUrl} alt={viewingProduct.title} referrerPolicy="no-referrer" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      <div className="absolute inset-0 bg-slate-950/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="p-3 bg-slate-900/90 text-white rounded-full shadow-lg flex items-center gap-1.5 text-xs font-black">
                          <ZoomIn className="h-4 w-4" />
                          <span>{lang === 'bn' ? 'জুুম করুন' : 'Zoom'}</span>
                        </span>
                      </div>
                    </>
                  ) : (
                    <ShoppingBag className="h-20 w-20 text-slate-800" />
                  )}
                  <span className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-black uppercase border backdrop-blur-md ${
                    viewingProduct.stock > 0 
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                  }`}>
                    {viewingProduct.stock > 0 ? `${viewingProduct.stock} ${lang === 'bn' ? 'স্টকে আছে' : 'In Stock'}` : (lang === 'bn' ? 'আউট অফ স্টক' : 'Out of Stock')}
                  </span>
                </div>

                <div className="flex flex-col justify-between space-y-4">
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">{lang === 'bn' ? 'বিস্তারিত বিবরণ' : 'Product Details'}</h4>
                      <p className="text-xs text-slate-300 mt-2 leading-relaxed whitespace-pre-wrap bg-slate-950/60 border border-white/5 p-4 rounded-2xl h-40 overflow-y-auto">
                        {lang === 'bn' ? (viewingProduct.descriptionBn || viewingProduct.description) : viewingProduct.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between bg-slate-950/40 p-3.5 rounded-2xl border border-white/5">
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold uppercase">{lang === 'bn' ? 'একক মূল্য' : 'Price per unit'}</span>
                        <p className="text-xl font-black text-emerald-400">৳{viewingProduct.price.toLocaleString()}</p>
                      </div>
                      
                      {/* Quantity Selector for detail page */}
                      {viewingProduct.stock > 0 && (
                        <div className="space-y-1">
                          <span className="text-[10px] text-slate-500 font-bold uppercase block text-right">{lang === 'bn' ? 'পরিমাণ' : 'Quantity'}</span>
                          <div className="flex items-center gap-2 bg-slate-900 border border-white/10 p-1 rounded-2xl">
                            <button 
                              type="button"
                              onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                              className="p-1.5 hover:bg-white/5 rounded-xl text-slate-400 hover:text-white cursor-pointer transition-colors"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="text-xs font-black px-2 w-7 text-center">{quantity}</span>
                            <button 
                              type="button"
                              onClick={() => setQuantity(prev => Math.min(viewingProduct.stock, prev + 1))}
                              className="p-1.5 hover:bg-white/5 rounded-xl text-slate-400 hover:text-white cursor-pointer transition-colors"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {quantity > 1 && (
                      <div className="flex justify-between items-center px-1 text-xs font-black text-indigo-300">
                        <span>{lang === 'bn' ? 'মোট মূল্য:' : 'Total Subtotal:'}</span>
                        <span className="text-sm font-black text-emerald-400">৳{(viewingProduct.price * quantity).toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-white/5 flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        addToClientCart(viewingProduct, quantity);
                        setViewingProduct(null);
                      }}
                      disabled={viewingProduct.stock <= 0}
                      className="flex-1 bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 hover:border-white/20 py-3 rounded-2xl text-xs font-black cursor-pointer active:scale-95 flex items-center justify-center gap-2 transition-all"
                    >
                      <ShoppingCart className="h-4 w-4 text-indigo-400" />
                      <span>{lang === 'bn' ? 'কার্টে রাখুন' : 'Add to Cart'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCheckoutProduct(viewingProduct);
                        setViewingProduct(null);
                      }}
                      disabled={viewingProduct.stock <= 0}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-2xl text-xs font-black cursor-pointer active:scale-95 flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/20"
                    >
                      <ShoppingBag className="h-4 w-4" />
                      <span>{lang === 'bn' ? 'সরাসরি অর্ডার' : 'Buy Now'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FULL-SCREEN IMAGE LIGHTBOX MODAL */}
      <AnimatePresence>
        {lightboxImage && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-lg">
            <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center justify-center">
              <button
                onClick={() => setLightboxImage(null)}
                className="absolute -top-12 right-0 p-3 bg-slate-800 hover:bg-slate-700 text-white rounded-full cursor-pointer"
              >
                <X className="h-6 w-6" />
              </button>
              <img
                src={lightboxImage}
                alt="Product Full View"
                referrerPolicy="no-referrer"
                className="max-w-full max-h-[80vh] object-contain rounded-3xl border border-white/10 shadow-2xl"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SHOPPING CART MODAL */}
      <AnimatePresence>
        {showClientCart && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-6 w-full max-w-xl shadow-2xl space-y-6 text-white my-8">
              <div className="flex justify-between items-center pb-4 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-indigo-400" />
                  <h3 className="text-base font-black text-slate-100">{lang === 'bn' ? 'আমার শপিং কার্ট' : 'Shopping Cart'}</h3>
                  <span className="bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-black">
                    {clientCart.length} {lang === 'bn' ? 'আইটেম' : 'items'}
                  </span>
                </div>
                <button onClick={() => setShowClientCart(false)} className="p-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-full cursor-pointer transition-colors"><X className="h-4.5 w-4.5" /></button>
              </div>

              {clientCart.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <ShoppingBag className="h-12 w-12 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-400">{lang === 'bn' ? 'আপনার কার্টটি খালি!' : 'Your cart is empty!'}</p>
                </div>
              ) : (
                <form onSubmit={handleClientCartCheckout} className="space-y-6">
                  {/* Cart Items List */}
                  <div className="max-h-64 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
                    {clientCart.map(({ product, quantity }, cIdx) => (
                      <div key={`client-cart-${product.id || 'p'}-${cIdx}`} className="bg-slate-950/60 border border-white/5 p-3 rounded-2xl flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center border border-white/5 overflow-hidden">
                            {product.imageUrl ? (
                              <img src={product.imageUrl} alt={product.title} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                            ) : (
                              <ShoppingBag className="h-5 w-5 text-indigo-400" />
                            )}
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-slate-200 line-clamp-1">{lang === 'bn' ? product.titleBn : product.title}</h4>
                            <p className="text-[10px] text-emerald-400 font-bold mt-0.5">৳{product.price.toLocaleString()} / unit</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {/* Quantity selector */}
                          <div className="flex items-center gap-1.5 bg-slate-900 border border-white/5 p-1 rounded-xl">
                            <button
                              type="button"
                              onClick={() => updateClientCartQty(product.id, -1)}
                              className="p-1 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white cursor-pointer transition-colors"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="text-[11px] font-black w-6 text-center">{quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateClientCartQty(product.id, 1)}
                              className="p-1 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white cursor-pointer transition-colors"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>

                          <div className="text-right min-w-[60px]">
                            <p className="text-xs font-black text-slate-200">৳{(product.price * quantity).toLocaleString()}</p>
                          </div>

                          <button
                            type="button"
                            onClick={() => setClientCart(prev => prev.filter(item => item.product.id !== product.id))}
                            className="p-1.5 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 rounded-lg cursor-pointer transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Delivery Info */}
                  <div className="bg-slate-950/40 border border-white/5 p-4 rounded-3xl space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">{lang === 'bn' ? 'ডেলিভারি ও যোগাযোগ তথ্য' : 'Delivery & Contact Information'}</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-400">{lang === 'bn' ? 'ডেলিভারি ঠিকানা' : 'Delivery Address'}</label>
                        <input
                          type="text"
                          required
                          placeholder={lang === 'bn' ? 'আপনার ঠিকানা লিখুন...' : 'Enter delivery address...'}
                          value={clientCartAddress}
                          onChange={(e) => setClientCartAddress(e.target.value)}
                          className="w-full bg-slate-950 border border-white/5 rounded-xl p-3 text-xs font-semibold text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-400">{lang === 'bn' ? 'মোবাইল নম্বর' : 'Phone Number'}</label>
                        <input
                          type="tel"
                          required
                          placeholder="01XXXXXXXXX"
                          value={clientCartPhone}
                          onChange={(e) => setClientCartPhone(e.target.value)}
                          className="w-full bg-slate-950 border border-white/5 rounded-xl p-3 text-xs font-semibold text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-400">{lang === 'bn' ? 'অর্ডার নোট (ঐচ্ছিক)' : 'Order Note (Optional)'}</label>
                      <input
                        type="text"
                        placeholder={lang === 'bn' ? 'কোনো বিশেষ অনুরোধ থাকলে লিখুন...' : 'Any special instructions...'}
                        value={clientCartNote}
                        onChange={(e) => setClientCartNote(e.target.value)}
                        className="w-full bg-slate-950 border border-white/5 rounded-xl p-3 text-xs font-semibold text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Payment Method Selection */}
                  <div className="bg-slate-950/40 border border-white/5 p-4 rounded-3xl space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400">{lang === 'bn' ? 'পেমেন্ট মেথড সিলেক্ট করুন' : 'Select Payment Method'}</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setClientCartPaymentMethod('Wallet')}
                        className={`p-3 rounded-2xl border text-xs font-black flex items-center justify-between transition-all cursor-pointer ${
                          clientCartPaymentMethod === 'Wallet'
                            ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-sm'
                            : 'bg-slate-950/60 border-white/5 text-slate-400 hover:border-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Wallet className="h-4 w-4 text-emerald-400" />
                          <span>{lang === 'bn' ? 'ওয়ালেট' : 'Wallet'}</span>
                        </div>
                        <span className="text-[10px] font-mono text-emerald-400 font-bold">৳{walletBalance.toLocaleString()}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setClientCartPaymentMethod('COD')}
                        className={`p-3 rounded-2xl border text-xs font-black flex items-center justify-between transition-all cursor-pointer ${
                          clientCartPaymentMethod === 'COD'
                            ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-sm'
                            : 'bg-slate-950/60 border-white/5 text-slate-400 hover:border-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4 text-amber-400" />
                          <span>{lang === 'bn' ? 'ক্যাশ অন ডেলিভারি' : 'Cash on Delivery'}</span>
                        </div>
                        <span className="text-[9px] font-mono text-amber-400 font-bold">COD</span>
                      </button>
                    </div>
                  </div>

                  {/* Wallet & checkout details */}
                  <div className="pt-4 border-t border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{lang === 'bn' ? 'মোট প্রদেয় মূল্য' : 'Total Payable'}</p>
                      <p className="text-xl font-black text-emerald-400">৳{clientCart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0).toLocaleString()}</p>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                      <button
                        type="submit"
                        disabled={isSubmitting || (clientCartPaymentMethod === 'Wallet' && walletBalance < clientCart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0))}
                        className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-8 py-3.5 rounded-2xl text-xs font-black shadow-lg shadow-indigo-600/20 cursor-pointer active:scale-95 transition-all w-full sm:w-auto text-center"
                      >
                        {isSubmitting ? (lang === 'bn' ? 'প্রক্রিয়াকরণ হচ্ছে...' : 'Processing...') : (lang === 'bn' ? 'অর্ডার সম্পন্ন করুন' : 'Confirm Order')}
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CHECKOUT MODAL */}
      <AnimatePresence>
        {checkoutProduct && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white rounded-[2.5rem] p-6 w-full max-w-md shadow-2xl space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-black text-slate-900">{lang === 'bn' ? 'প্রোডাক্ট অর্ডার কনফার্ম করুন' : 'Confirm Product Order'}</h3>
                <button onClick={() => setCheckoutProduct(null)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full cursor-pointer"><X className="h-4 w-4" /></button>
              </div>

              <form onSubmit={handlePlaceOrder} className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-2xl flex items-center gap-3">
                  <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center font-black text-indigo-600">
                    <ShoppingBag className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900">{lang === 'bn' ? checkoutProduct.titleBn : checkoutProduct.title}</h4>
                    <p className="text-xs font-bold text-indigo-600">৳{checkoutProduct.price} / unit</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400">{lang === 'bn' ? 'পরিমাণ (Quantity)' : 'Quantity'}</label>
                  <input
                    type="number"
                    min="1"
                    max={checkoutProduct.stock}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-slate-100 rounded-xl p-3 text-xs font-bold border-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400">{lang === 'bn' ? 'ডেলিভারি ঠিকানা' : 'Delivery Address'}</label>
                  <input
                    type="text"
                    required
                    placeholder={lang === 'bn' ? 'আপনার ঠিকানা লিখুন...' : 'Enter delivery address...'}
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="w-full bg-slate-100 rounded-xl p-3 text-xs font-semibold border-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400">{lang === 'bn' ? 'মোবাইল নম্বর' : 'Phone Number'}</label>
                  <input
                    type="tel"
                    required
                    placeholder="01XXXXXXXXX"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full bg-slate-100 rounded-xl p-3 text-xs font-semibold border-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400">{lang === 'bn' ? 'পেমেন্ট মেথড' : 'Payment Method'}</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSingleCheckoutPaymentMethod('Wallet')}
                      className={`p-2.5 rounded-xl border text-xs font-black flex items-center justify-between cursor-pointer ${
                        singleCheckoutPaymentMethod === 'Wallet'
                          ? 'bg-indigo-50 border-indigo-600 text-indigo-700 font-extrabold'
                          : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      <span className="flex items-center gap-1">
                        <Wallet className="h-3.5 w-3.5 text-emerald-600" />
                        <span>{lang === 'bn' ? 'ওয়ালেট' : 'Wallet'}</span>
                      </span>
                      <span className="text-[9px] font-mono font-bold text-emerald-600">৳{walletBalance.toLocaleString()}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSingleCheckoutPaymentMethod('COD')}
                      className={`p-2.5 rounded-xl border text-xs font-black flex items-center justify-between cursor-pointer ${
                        singleCheckoutPaymentMethod === 'COD'
                          ? 'bg-indigo-50 border-indigo-600 text-indigo-700 font-extrabold'
                          : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      <span className="flex items-center gap-1">
                        <Truck className="h-3.5 w-3.5 text-amber-600" />
                        <span>{lang === 'bn' ? 'ক্যাশ অন ডেলিভারি' : 'COD'}</span>
                      </span>
                      <span className="text-[9px] font-mono font-bold text-amber-600">COD</span>
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{lang === 'bn' ? 'মোট প্রদেয়' : 'Total Payable'}</p>
                    <p className="text-base font-black text-indigo-600">৳{(checkoutProduct.price * quantity).toLocaleString()}</p>
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting || (singleCheckoutPaymentMethod === 'Wallet' && walletBalance < (checkoutProduct.price * quantity))}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-6 py-3 rounded-2xl text-xs font-black shadow-md cursor-pointer active:scale-95"
                  >
                    {isSubmitting ? (lang === 'bn' ? 'প্রসেসিং...' : 'Processing...') : (lang === 'bn' ? 'অর্ডার কনফার্ম করুন' : 'Confirm Order')}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ADD/EDIT PRODUCT MODAL */}
      <AnimatePresence>
        {showProductModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white rounded-[2.5rem] p-6 w-full max-w-md shadow-2xl space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-black text-slate-900">{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
                <button onClick={() => setShowProductModal(false)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full cursor-pointer"><X className="h-4 w-4" /></button>
              </div>

              <form onSubmit={handleSaveProduct} className="space-y-3">
                <input
                  type="text"
                  required
                  placeholder="Product Title (English)"
                  value={productForm.title}
                  onChange={(e) => setProductForm({ ...productForm, title: e.target.value })}
                  className="w-full bg-slate-100 rounded-xl p-3 text-xs font-semibold border-none"
                />
                <input
                  type="text"
                  placeholder="প্রোডাক্টের নাম (বাংলা)"
                  value={productForm.titleBn}
                  onChange={(e) => setProductForm({ ...productForm, titleBn: e.target.value })}
                  className="w-full bg-slate-100 rounded-xl p-3 text-xs font-semibold border-none"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    required
                    placeholder="Price (৳)"
                    value={productForm.price || ''}
                    onChange={(e) => setProductForm({ ...productForm, price: Number(e.target.value) })}
                    className="w-full bg-slate-100 rounded-xl p-3 text-xs font-semibold border-none"
                  />
                  <input
                    type="number"
                    required
                    placeholder="Stock Qty"
                    value={productForm.stock || ''}
                    onChange={(e) => setProductForm({ ...productForm, stock: Number(e.target.value) })}
                    className="w-full bg-slate-100 rounded-xl p-3 text-xs font-semibold border-none"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Category (e.g. Electronics)"
                  value={productForm.category}
                  onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                  className="w-full bg-slate-100 rounded-xl p-3 text-xs font-semibold border-none"
                />
                <textarea
                  placeholder="Description"
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  className="w-full bg-slate-100 rounded-xl p-3 text-xs font-semibold border-none h-20"
                />
                <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-black text-xs shadow-md cursor-pointer">
                  Save Product
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SUPPLIER MODAL */}
      <AnimatePresence>
        {showSupplierModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div className="bg-white rounded-[2.5rem] p-6 w-full max-w-md shadow-2xl space-y-4">
              <h3 className="text-base font-black text-slate-900">Add New Supplier</h3>
              <form onSubmit={handleSaveSupplier} className="space-y-3">
                <input type="text" required placeholder="Company Name" value={supplierForm.companyName} onChange={e => setSupplierForm({...supplierForm, companyName: e.target.value})} className="w-full bg-slate-100 rounded-xl p-3 text-xs border-none" />
                <input type="text" placeholder="Contact Person" value={supplierForm.contactPerson} onChange={e => setSupplierForm({...supplierForm, contactPerson: e.target.value})} className="w-full bg-slate-100 rounded-xl p-3 text-xs border-none" />
                <input type="tel" inputMode="numeric" pattern="[0-9]*" required placeholder="Phone" value={supplierForm.phone} onChange={e => setSupplierForm({...supplierForm, phone: e.target.value.replace(/\D/g, '')})} className="w-full bg-slate-100 rounded-xl p-3 text-xs border-none" />
                <input type="text" placeholder="Address" value={supplierForm.address} onChange={e => setSupplierForm({...supplierForm, address: e.target.value})} className="w-full bg-slate-100 rounded-xl p-3 text-xs border-none" />
                <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-black text-xs">Save Supplier</button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CUSTOMER MODAL */}
      <AnimatePresence>
        {showCustomerModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div className="bg-white rounded-[2.5rem] p-6 w-full max-w-md shadow-2xl space-y-4">
              <h3 className="text-base font-black text-slate-900">Add New Customer</h3>
              <form onSubmit={handleSaveCustomer} className="space-y-3">
                <input type="text" required placeholder="Customer Name" value={customerForm.name} onChange={e => setCustomerForm({...customerForm, name: e.target.value})} className="w-full bg-slate-100 rounded-xl p-3 text-xs border-none" />
                <input type="tel" inputMode="numeric" pattern="[0-9]*" required placeholder="Phone Number" value={customerForm.phone} onChange={e => setCustomerForm({...customerForm, phone: e.target.value.replace(/\D/g, '')})} className="w-full bg-slate-100 rounded-xl p-3 text-xs border-none" />
                <input type="text" placeholder="Address" value={customerForm.address} onChange={e => setCustomerForm({...customerForm, address: e.target.value})} className="w-full bg-slate-100 rounded-xl p-3 text-xs border-none" />
                <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-black text-xs">Save Customer</button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* EXPENSE MODAL */}
      <AnimatePresence>
        {showExpenseModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div className="bg-white rounded-[2.5rem] p-6 w-full max-w-md shadow-2xl space-y-4">
              <h3 className="text-base font-black text-slate-900">Add Shop Expense</h3>
              <form onSubmit={handleSaveExpense} className="space-y-3">
                <input type="text" required placeholder="Expense Title (e.g. Electricity Bill)" value={expenseForm.title} onChange={e => setExpenseForm({...expenseForm, title: e.target.value})} className="w-full bg-slate-100 rounded-xl p-3 text-xs border-none" />
                <input type="number" required placeholder="Amount (৳)" value={expenseForm.amount || ''} onChange={e => setExpenseForm({...expenseForm, amount: Number(e.target.value)})} className="w-full bg-slate-100 rounded-xl p-3 text-xs border-none" />
                <input type="text" placeholder="Category (e.g. Utility, Salary, Rent)" value={expenseForm.category} onChange={e => setExpenseForm({...expenseForm, category: e.target.value})} className="w-full bg-slate-100 rounded-xl p-3 text-xs border-none" />
                <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-black text-xs">Save Expense</button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ORDER SUCCESS MODAL */}
      <AnimatePresence>
        {orderSuccess && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-6 w-full max-w-sm shadow-2xl text-center space-y-4 text-white">
              <div className="mx-auto h-16 w-16 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-9 w-9" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-100">{lang === 'bn' ? 'অর্ডার সফলভাবে জমা হয়েছে!' : 'Order Placed Successfully!'}</h3>
                <p className="text-xs text-slate-400 mt-2 font-mono">{orderSuccess}</p>
              </div>
              <button onClick={() => { setOrderSuccess(null); setActiveTab('orders'); }} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3.5 rounded-2xl font-black text-xs cursor-pointer active:scale-95 transition-all">
                {lang === 'bn' ? 'আমার অর্ডার দেখুন' : 'View My Orders'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
