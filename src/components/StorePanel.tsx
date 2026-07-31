import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingBag, Search, Tag, Info, AlertTriangle, CheckCircle2, 
  ShoppingBag as BagIcon, Clock, ArrowLeft, Send, MapPin, Phone, 
  User, Check, AlertCircle, ShoppingCart, RefreshCw, X,
  Calculator, Barcode, Users, DollarSign, TrendingUp, Printer, FileText, Plus, Trash2, Edit3, ShieldCheck, Package, Layers, PieChart
} from 'lucide-react';
import { StoreProduct, StoreOrder, Language, Supplier, Customer, ExpenseRecord, IncomeRecord, POSCartItem } from '../types';
import { collection, doc, onSnapshot, writeBatch, query, where, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';

interface StorePanelProps {
  lang: Language;
  walletBalance: number;
}

export default function StorePanel({ lang, walletBalance }: StorePanelProps) {
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Navigation tabs: browse | pos | inventory | suppliers | customers | expenses | reports | orders
  const [activeTab, setActiveTab] = useState<'browse' | 'pos' | 'inventory' | 'suppliers' | 'customers' | 'expenses' | 'reports' | 'orders'>('browse');

  // Filter & search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Purchase flow states
  const [selectedProduct, setSelectedProduct] = useState<StoreProduct | null>(null);
  const [checkoutProduct, setCheckoutProduct] = useState<StoreProduct | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [orderNote, setOrderNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);

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

  const categories = ['All', ...Array.from(new Set(products.map(p => p.category || 'Lifestyle').filter((c): c is string => typeof c === 'string' && c.trim() !== '' && c.toLowerCase() !== 'all')))];

  const filteredProducts = products.filter(p => {
    const title = p.title || '';
    const titleBn = p.titleBn || '';
    const query = searchQuery ? searchQuery.toLowerCase() : '';
    return title.toLowerCase().includes(query) || titleBn.toLowerCase().includes(query);
  });

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !checkoutProduct) return;

    if (checkoutProduct.stock < quantity) {
      alert(lang === 'bn' ? 'দুঃখিত, পর্যাপ্ত স্টক নেই!' : 'Sorry, insufficient stock available!');
      return;
    }

    const totalCost = checkoutProduct.price * quantity;
    if (walletBalance < totalCost) {
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
      note: orderNote
    };

    const batch = writeBatch(db);
    try {
      batch.set(doc(db, 'store_orders', newOrderId), newOrder);
      const newBalanceVal = Math.max(walletBalance - totalCost, 0);
      batch.set(doc(db, 'users', currentUser.uid, 'wallet', 'balance_doc'), { balance: newBalanceVal });

      const txId = `tx-store-${Date.now()}`;
      const storeTx = {
        id: txId,
        type: 'Voucher',
        amount: totalCost,
        billerName: `Store: ${checkoutProduct.title} (x${quantity})`,
        billerNameBn: `স্টোর: ${checkoutProduct.titleBn} (x${quantity})`,
        date: dateStr,
        txId: newOrderId,
        status: 'Pending',
        userId: currentUser.uid,
        userEmail: currentUser.email,
        note: `Phone: ${contactPhone} | Addr: ${deliveryAddress}`
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
      {/* A2Z Shop Management Top Header & Navigation Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-[2.5rem] p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-indigo-600 text-white text-[10px] font-black uppercase px-3 py-1 rounded-full tracking-wider">
                {lang === 'bn' ? 'এটুজেড শপ ও পিওএস সিস্টেম' : 'A2Z Shop & POS System'}
              </span>
              <span className="text-xs text-indigo-300 font-semibold">PC & Mobile Responsive</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black mt-2 tracking-tight">
              {lang === 'bn' ? 'স্মার্ট শপ ম্যানেজমেন্ট ও পিওএস' : 'A2Z Smart Shop & POS Management'}
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              {lang === 'bn' ? 'আপনার দোকানের স্টক, পিওএস বিলিং, সাপ্লায়ার, কাস্টমার এবং দৈনিক হিসাব রাখুন অত্যন্ত সহজে।' : 'Manage inventory, POS quick billing, suppliers, customers, expenses, and invoices in one seamless platform.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10">
              <p className="text-[10px] text-indigo-200 font-bold uppercase">{lang === 'bn' ? 'মোট স্টক ভ্যালু' : 'Total Stock Value'}</p>
              <p className="text-base font-black text-white">৳{totalStockValue.toLocaleString()}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10">
              <p className="text-[10px] text-emerald-300 font-bold uppercase">{lang === 'bn' ? 'মোট প্রোডাক্ট' : 'Total Products'}</p>
              <p className="text-base font-black text-white">{products.length}</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation Menu */}
        <div className="flex items-center gap-2 overflow-x-auto mt-6 pt-4 border-t border-white/10 scrollbar-none">
          {[
            { id: 'browse', label: lang === 'bn' ? 'অনলাইন শপ' : 'Online Shop', icon: ShoppingBag },
            { id: 'pos', label: lang === 'bn' ? 'POS টার্মিনাল' : 'POS Terminal', icon: Calculator },
            { id: 'inventory', label: lang === 'bn' ? 'স্টক ও প্রোডাক্ট' : 'Inventory', icon: Package },
            { id: 'suppliers', label: lang === 'bn' ? 'সাপ্লায়ার্স' : 'Suppliers', icon: Users },
            { id: 'customers', label: lang === 'bn' ? 'কাস্টমার্স' : 'Customers', icon: User },
            { id: 'expenses', label: lang === 'bn' ? 'খরচ ও আয়' : 'Expenses', icon: DollarSign },
            { id: 'reports', label: lang === 'bn' ? 'রিপোর্টস' : 'Reports', icon: TrendingUp },
            { id: 'orders', label: lang === 'bn' ? 'আমার অর্ডার' : 'My Orders', icon: Clock },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                  isActive 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' 
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
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder={lang === 'bn' ? 'প্রোডাক্ট খুঁজুন...' : 'Search store products...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border-none rounded-2xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto scrollbar-none">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-2xl text-xs font-black cursor-pointer transition-all whitespace-nowrap ${
                    selectedCategory === cat ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-20">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-indigo-600" />
              <p className="text-xs text-slate-400 mt-2 font-semibold">{lang === 'bn' ? 'প্রোডাক্ট লোড হচ্ছে...' : 'Loading products...'}</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 shadow-sm space-y-3">
              <ShoppingBag className="h-12 w-12 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-600">{lang === 'bn' ? 'কোনো প্রোডাক্ট পাওয়া যায়নি' : 'No products found'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredProducts.map(product => (
                <motion.div
                  key={product.id}
                  whileHover={{ y: -4 }}
                  className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between group"
                >
                  <div>
                    <div className="aspect-video bg-gradient-to-br from-indigo-50 to-slate-100 rounded-2xl flex items-center justify-center relative overflow-hidden mb-4">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <ShoppingBag className="h-10 w-10 text-indigo-400" />
                      )}
                      <span className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-black ${
                        product.stock > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                      }`}>
                        {product.stock > 0 ? `${product.stock} in stock` : 'Out of Stock'}
                      </span>
                    </div>
                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider">{product.category || 'General'}</span>
                    <h3 className="text-sm font-black text-slate-900 mt-1 line-clamp-1">{lang === 'bn' ? product.titleBn : product.title}</h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{lang === 'bn' ? product.descriptionBn : product.description}</p>
                  </div>
                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{lang === 'bn' ? 'মূল্য' : 'Price'}</p>
                      <p className="text-base font-black text-indigo-600">৳{product.price.toLocaleString()}</p>
                    </div>
                    <button
                      onClick={() => setCheckoutProduct(product)}
                      disabled={product.stock <= 0}
                      className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer active:scale-95 shadow-sm shadow-indigo-500/10 flex items-center gap-1.5"
                    >
                      <ShoppingCart className="h-3.5 w-3.5" />
                      <span>{lang === 'bn' ? 'অর্ডার করুন' : 'Buy Now'}</span>
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: POS TERMINAL */}
      {activeTab === 'pos' && (
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
              {filteredProducts.map(p => (
                <div
                  key={p.id}
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
                  posCart.map(item => (
                    <div key={item.product.id} className="bg-slate-50 p-3 rounded-2xl flex items-center justify-between">
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
      {activeTab === 'inventory' && (
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
                {products.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/50">
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
      {activeTab === 'suppliers' && (
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
              suppliers.map(s => (
                <div key={s.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
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
      {activeTab === 'customers' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <User className="h-5 w-5 text-indigo-600" />
              <span>{lang === 'bn' ? 'কাস্টমার লেজার ও খাতা' : 'Customer Ledger & Accounts'}</span>
            </h3>
            <button
              onClick={() => setShowCustomerModal(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>{lang === 'bn' ? 'কাস্টমার যোগ করুন' : 'Add Customer'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {customers.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center col-span-full">{lang === 'bn' ? 'কোনো কাস্টমার নেই' : 'No customers added yet'}</p>
            ) : (
              customers.map(c => (
                <div key={c.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                  <h4 className="text-sm font-black text-slate-900">{c.name}</h4>
                  <p className="text-xs text-slate-500 font-semibold">Phone: {c.phone}</p>
                  <p className="text-xs text-slate-400">Address: {c.address || 'N/A'}</p>
                  <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Due Balance</span>
                    <span className="text-xs font-black text-rose-600">৳{c.dueAmount.toLocaleString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 6: EXPENSES & INCOME */}
      {activeTab === 'expenses' && (
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
                {expenses.map(e => (
                  <tr key={e.id}>
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
      {activeTab === 'reports' && (
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

      {/* TAB 8: MY ORDERS */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-6">
          <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Clock className="h-5 w-5 text-indigo-600" />
            <span>{lang === 'bn' ? 'আমার শপ অর্ডার ইতিহাস' : 'My Store Order History'}</span>
          </h3>

          <div className="space-y-3">
            {orders.length === 0 ? (
              <p className="text-xs text-slate-400 py-12 text-center">{lang === 'bn' ? 'কোনো অর্ডার করা হয়নি' : 'No store orders placed yet'}</p>
            ) : (
              orders.map(order => (
                <div key={order.id} className="bg-slate-50 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                      order.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                      order.status === 'Rejected' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {order.status}
                    </span>
                    <h4 className="text-sm font-black text-slate-900 mt-2">{lang === 'bn' ? order.productTitleBn : order.productTitle}</h4>
                    <p className="text-xs text-slate-500">Qty: {order.quantity} | Total: ৳{order.totalPrice.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 font-bold">{new Date(order.date).toLocaleDateString()}</p>
                    <p className="text-xs font-mono font-bold text-slate-600">{order.id}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

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

                <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Total Payable</p>
                    <p className="text-base font-black text-indigo-600">৳{(checkoutProduct.price * quantity).toLocaleString()}</p>
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting || walletBalance < (checkoutProduct.price * quantity)}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-6 py-3 rounded-2xl text-xs font-black shadow-md cursor-pointer active:scale-95"
                  >
                    {isSubmitting ? 'Processing...' : 'Confirm Order'}
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
                <input type="tel" required placeholder="Phone" value={supplierForm.phone} onChange={e => setSupplierForm({...supplierForm, phone: e.target.value})} className="w-full bg-slate-100 rounded-xl p-3 text-xs border-none" />
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
                <input type="tel" required placeholder="Phone Number" value={customerForm.phone} onChange={e => setCustomerForm({...customerForm, phone: e.target.value})} className="w-full bg-slate-100 rounded-xl p-3 text-xs border-none" />
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-white rounded-[2.5rem] p-6 w-full max-w-sm shadow-2xl text-center space-y-4">
              <div className="mx-auto h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-9 w-9" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">{lang === 'bn' ? 'অর্ডার সফলভাবে জমা হয়েছে!' : 'Order Placed Successfully!'}</h3>
                <p className="text-xs text-slate-500 mt-2">{orderSuccess}</p>
              </div>
              <button onClick={() => { setOrderSuccess(null); setActiveTab('orders'); }} className="w-full bg-indigo-600 text-white py-3 rounded-2xl font-black text-xs cursor-pointer">
                {lang === 'bn' ? 'আমার অর্ডার দেখুন' : 'View My Orders'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
