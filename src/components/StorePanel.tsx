import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingBag, Search, Tag, Info, AlertTriangle, CheckCircle2, 
  ShoppingBag as BagIcon, Clock, ArrowLeft, Send, MapPin, Phone, 
  User, Check, AlertCircle, ShoppingCart, RefreshCw, X
} from 'lucide-react';
import { StoreProduct, StoreOrder, Language } from '../types';
import { collection, doc, onSnapshot, writeBatch, query, where, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';

interface StorePanelProps {
  lang: Language;
  walletBalance: number;
}

export default function StorePanel({ lang, walletBalance }: StorePanelProps) {
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'browse' | 'orders'>('browse');

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
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null); // Order ID on success

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

  // Real-time subscribe to user's orders
  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, 'store_orders'), where('userId', '==', currentUser.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ords: StoreOrder[] = [];
      snapshot.forEach((docSnap) => {
        ords.push({ id: docSnap.id, ...docSnap.data() } as StoreOrder);
      });
      // Sort orders by date descending
      ords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setOrders(ords);
    }, (error) => {
      console.error("Error fetching user orders: ", error);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Handle contact phone prefill on checkout modal open
  useEffect(() => {
    if (checkoutProduct && currentUser) {
      setContactPhone('');
      // Attempt to retrieve prefilled phone from user profile
      const userDocRef = doc(db, 'registered_users', currentUser.uid);
      getDoc(userDocRef).then((snap) => {
        if (snap.exists() && snap.data().phone) {
          setContactPhone(snap.data().phone);
        }
      }).catch(err => console.log("Prefill fetch skipped:", err));
    }
  }, [checkoutProduct, currentUser]);

  const categories = ['All', ...Array.from(new Set(products.map(p => p.category || 'Lifestyle').filter((c): c is string => typeof c === 'string' && c.trim() !== '' && c.toLowerCase() !== 'all')))];

  const filteredProducts = products.filter(p => {
    const title = p.title || '';
    const titleBn = p.titleBn || '';
    const desc = p.description || '';
    const descBn = p.descriptionBn || '';
    const query = searchQuery ? searchQuery.toLowerCase() : '';

    const matchesSearch = 
      title.toLowerCase().includes(query) ||
      titleBn.toLowerCase().includes(query) ||
      desc.toLowerCase().includes(query) ||
      descBn.toLowerCase().includes(query);
    
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
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

    if (!deliveryAddress.trim()) {
      alert(lang === 'bn' ? 'অনুগ্রহ করে ডেলিভারি ঠিকানা লিখুন!' : 'Please enter delivery address!');
      return;
    }

    if (!contactPhone.trim()) {
      alert(lang === 'bn' ? 'অনুগ্রহ করে সচল মোবাইল নম্বর লিখুন!' : 'Please enter contact phone number!');
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

    // User Notification Object
    const addedNotifId = `notif-${Date.now()}`;
    const addedNotif = {
      id: addedNotifId,
      title: lang === 'bn' ? 'অর্ডার পেন্ডিং' : 'Order Placed',
      titleBn: 'অর্ডারটি প্রক্রিয়াধীন',
      desc: `Your order for ${checkoutProduct.title} (x${quantity}) is placed. Awaiting admin delivery.`,
      descBn: `আপনার ${checkoutProduct.titleBn} (x${quantity}) অর্ডারের অনুরোধটি সফলভাবে জমা হয়েছে এবং তা অনুমোদনের অপেক্ষায় আছে।`,
      time: 'Just now',
      read: false,
    };

    // Also deduct balance immediately to hold funds, and decrease stock (optional, but we can do it on admin approve, or reserve it here)
    // To avoid double spend and reserve, let's dock balance immediately
    const batch = writeBatch(db);
    try {
      // 1. Create the store order document
      batch.set(doc(db, 'store_orders', newOrderId), newOrder);

      // 2. Dock wallet balance immediately
      const newBalanceVal = Math.max(walletBalance - totalCost, 0);
      batch.set(doc(db, 'users', currentUser.uid, 'wallet', 'balance_doc'), { balance: newBalanceVal });

      // 3. Save order to customer transactions array as dynamic store purchase history
      const txId = `tx-store-${Date.now()}`;
      const storeTx = {
        id: txId,
        type: 'Voucher', // categorizes cleanly
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

      // 4. Set Notification
      batch.set(doc(db, 'users', currentUser.uid, 'notifications', addedNotifId), addedNotif);

      // We will actually subtract stock when admin approves, so if rejected stock returns, or deduct now? Let's subtract stock now to prevent overselling!
      const finalStock = Math.max(checkoutProduct.stock - quantity, 0);
      batch.update(doc(db, 'products', checkoutProduct.id), { stock: finalStock });

      await batch.commit();

      setOrderSuccess(newOrderId);
      setCheckoutProduct(null);
      setSelectedProduct(null);
      setQuantity(1);
      setDeliveryAddress('');
      setOrderNote('');
    } catch (err) {
      console.error("Order error:", err);
      alert(lang === 'bn' ? 'অর্ডার দিতে সমস্যা হয়েছে!' : 'Failed to place order. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-28 pt-4 select-none scrollbar-none max-w-md mx-auto w-full" id="store-panel-container">
      {/* Tab switching */}
      <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl mb-5" id="store-tabs">
        <button
          onClick={() => { setActiveTab('browse'); setOrderSuccess(null); }}
          className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'browse' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-800'
          }`}
          id="store-tab-browse"
        >
          <ShoppingBag className="h-4 w-4" />
          <span>{lang === 'bn' ? 'প্রোডাক্ট স্টোর' : 'Product Store'}</span>
        </button>
        <button
          onClick={() => { setActiveTab('orders'); setOrderSuccess(null); }}
          className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer relative ${
            activeTab === 'orders' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-800'
          }`}
          id="store-tab-orders"
        >
          <Clock className="h-4 w-4" />
          <span>{lang === 'bn' ? 'আমার অর্ডারসমূহ' : 'My Orders'}</span>
          {orders.filter(o => o.status === 'Pending').length > 0 && (
            <span className="absolute top-1.5 right-2 w-2 h-2 bg-indigo-600 rounded-full animate-ping" />
          )}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'browse' ? (
          <motion.div
            key="browse"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* Header info */}
            <div className="bg-gradient-to-r from-blue-700 via-indigo-600 to-indigo-800 rounded-3xl p-5 text-white shadow-lg flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black tracking-tight flex items-center gap-1.5">
                  <BagIcon className="h-5 w-5" />
                  {lang === 'bn' ? 'NIHAD BUSINESS POINT মেগা স্টোর' : 'NIHAD BUSINESS POINT Mega Store'}
                </h2>
                <p className="text-[11px] text-white/80 font-bold mt-1">
                  {lang === 'bn' ? 'ডিজিটাল ও ফিজিক্যাল লাইফস্টাইল গুডস' : 'Premium Digital & Physical Lifestyle Goods'}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-black uppercase text-blue-100 bg-white/10 px-2.5 py-1 rounded-full border border-white/15">
                  {lang === 'bn' ? 'ব্যালেন্স' : 'Balance'}
                </span>
                <p className="text-lg font-black mt-1">৳{walletBalance.toLocaleString()}</p>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
                <input
                  type="text"
                  placeholder={lang === 'bn' ? 'প্রোডাক্ট অনুসন্ধান করুন...' : 'Search products...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-100 border-none rounded-2xl py-3 pl-11 pr-4 text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20 text-slate-800"
                />
              </div>

              {/* Category selector */}
              <div className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-none">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-[11px] font-black tracking-tight border transition-all cursor-pointer ${
                      selectedCategory === cat 
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' 
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {cat === 'All' ? (lang === 'bn' ? 'সব প্রোডাক্ট' : 'All') : cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Products grid */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
                <RefreshCw className="h-7 w-7 animate-spin text-indigo-600" />
                <p className="text-xs font-bold">{lang === 'bn' ? 'প্রোডাক্ট লোড হচ্ছে...' : 'Loading products...'}</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-2 border border-dashed border-slate-200 rounded-3xl bg-slate-50 text-slate-400">
                <ShoppingBag className="h-10 w-10 text-slate-300" />
                <p className="text-xs font-bold">{lang === 'bn' ? 'কোন প্রোডাক্ট পাওয়া যায়নি!' : 'No products found!'}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3" id="products-grid">
                {filteredProducts.map((product, idx) => {
                  const outOfStock = product.stock <= 0;
                  return (
                    <motion.div
                      key={`${product.id || 'prod'}-${idx}`}
                      onClick={() => !outOfStock && setSelectedProduct(product)}
                      whileTap={!outOfStock ? { scale: 0.98 } : undefined}
                      className={`bg-white border border-slate-100 rounded-3xl p-3 shadow-sm hover:shadow-md transition-all flex flex-col justify-between cursor-pointer relative group overflow-hidden ${
                        outOfStock ? 'opacity-65 cursor-not-allowed' : ''
                      }`}
                    >
                      {/* Out of stock label */}
                      {outOfStock && (
                        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center z-10">
                          <span className="bg-rose-600 text-white text-[9px] font-black uppercase px-2.5 py-1 rounded-full shadow">
                            {lang === 'bn' ? 'স্টক শেষ' : 'Out of Stock'}
                          </span>
                        </div>
                      )}

                      <div>
                        {/* Image placeholder or real image */}
                        <div className="aspect-square w-full rounded-2xl bg-gradient-to-tr from-slate-50 to-indigo-50/20 border border-slate-100 flex items-center justify-center overflow-hidden mb-2.5 relative">
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.title}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                            />
                          ) : (
                            <ShoppingBag className="h-8 w-8 text-indigo-500/30" />
                          )}
                          <span className="absolute top-2 left-2 bg-indigo-100 text-indigo-600 text-[8px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full">
                            {product.category}
                          </span>
                        </div>

                        {/* Text details */}
                        <h3 className="text-xs font-black text-slate-800 line-clamp-1">
                          {lang === 'bn' ? product.titleBn : product.title}
                        </h3>
                        <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">
                          {lang === 'bn' ? product.descriptionBn : product.description}
                        </p>
                      </div>

                      {/* Pricing and buy block */}
                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                        <div>
                          <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">{lang === 'bn' ? 'মূল্য' : 'Price'}</p>
                          <p className="text-sm font-black text-indigo-600">৳{product.price.toLocaleString()}</p>
                        </div>
                        <span className="text-[9px] text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full font-bold">
                          {lang === 'bn' ? `স্টক: ${product.stock}` : `${product.stock} In Stock`}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        ) : (
          /* User's Order history list */
          <motion.div
            key="orders"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            {orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 gap-3 border border-dashed border-slate-200 rounded-3xl bg-slate-50 text-slate-400">
                <Clock className="h-10 w-10 text-slate-300" />
                <div className="text-center">
                  <p className="text-xs font-black text-slate-500">{lang === 'bn' ? 'কোন পূর্ববর্তী অর্ডার পাওয়া যায়নি!' : 'No previous orders found!'}</p>
                  <p className="text-[10px] text-slate-400 mt-1 px-4">{lang === 'bn' ? 'আপনার কেনা পণ্যের সকল হিস্ট্রি এখানে দেখানো হবে।' : 'All of your product purchases will show up right here.'}</p>
                </div>
              </div>
            ) : (
              orders.map((order, idx) => {
                const isPending = order.status === 'Pending';
                const isApproved = order.status === 'Approved';
                const isRejected = order.status === 'Rejected';

                return (
                  <div
                    key={`${order.id || 'order'}-${idx}`}
                    className="bg-white border border-slate-100 rounded-3xl p-4 shadow-sm flex flex-col gap-3 relative overflow-hidden"
                  >
                    {/* Status accent indicator */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                      isApproved ? 'bg-emerald-500' : isRejected ? 'bg-rose-500' : 'bg-amber-500'
                    }`} />

                    <div className="flex justify-between items-start pl-1.5">
                      <div>
                        <h4 className="text-xs font-black text-slate-800">
                          {lang === 'bn' ? order.productTitleBn : order.productTitle}
                        </h4>
                        <p className="text-[10px] text-slate-400 font-bold mt-1">
                          ID: {order.id} | {new Date(order.date).toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <span className={`text-[9px] font-black px-2.5 py-1 rounded-full border uppercase tracking-wider ${
                        isApproved ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                        isRejected ? 'bg-rose-50 text-rose-600 border-rose-100' :
                        'bg-amber-50 text-amber-600 border-amber-100'
                      }`}>
                        {order.status === 'Pending' ? (lang === 'bn' ? 'অপেক্ষমান' : 'Pending') :
                         order.status === 'Approved' ? (lang === 'bn' ? 'ডেলিভার্ড' : 'Delivered') :
                         (lang === 'bn' ? 'প্রত্যাখ্যাত' : 'Rejected')}
                      </span>
                    </div>

                    {/* Order particulars */}
                    <div className="bg-slate-50 rounded-2xl p-3 space-y-1.5 text-[11px] font-bold text-slate-600 pl-4">
                      <div className="flex justify-between">
                        <span>{lang === 'bn' ? 'পরিমাণ:' : 'Quantity:'}</span>
                        <span className="text-slate-800">x{order.quantity}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{lang === 'bn' ? 'একক মূল্য:' : 'Unit Price:'}</span>
                        <span className="text-slate-800">৳{order.price.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-slate-200 text-xs font-black">
                        <span className="text-slate-700">{lang === 'bn' ? 'মোট পেমেন্ট:' : 'Total Amount:'}</span>
                        <span className="text-indigo-600">৳{order.totalPrice.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Delivery updates and notes */}
                    {order.deliveryAddress && (
                      <div className="pl-1.5 text-[10px] text-slate-400 space-y-1">
                        <p className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
                          <span><strong>{lang === 'bn' ? 'ঠিকানা:' : 'Addr:'}</strong> {order.deliveryAddress}</span>
                        </p>
                        {order.note && (
                          <p>
                            <strong>{lang === 'bn' ? 'নোট:' : 'Memo:'}</strong> {order.note}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Admin comments / Rejection explanations */}
                    {isRejected && order.rejectionReason && (
                      <div className="mt-1 p-3 bg-rose-50 border border-rose-100/40 rounded-2xl text-rose-700 text-[11px] font-semibold flex items-start gap-1.5 pl-4">
                        <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />
                        <div>
                          <p className="font-bold">{lang === 'bn' ? 'অপ্রত্যাশিত বাধার কারণ:' : 'Reason for rejection:'}</p>
                          <p className="opacity-90">{order.rejectionReason}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Product Detail Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-slate-900/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="bg-white rounded-t-[2.5rem] md:rounded-[2.5rem] p-6 w-full max-w-md shadow-2xl max-h-[85vh] md:max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-4">
                <span className="bg-indigo-100 text-indigo-600 text-[10px] font-black tracking-wider uppercase px-3 py-1 rounded-full">
                  {selectedProduct.category}
                </span>
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="p-2 hover:bg-slate-100 rounded-full cursor-pointer transition-all active:scale-90"
                >
                  <X className="h-5 w-5 text-slate-500" />
                </button>
              </div>

              {/* Product Image */}
              <div className="aspect-video w-full rounded-3xl bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden mb-4">
                {selectedProduct.imageUrl ? (
                  <img
                    src={selectedProduct.imageUrl}
                    alt={selectedProduct.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ShoppingBag className="h-12 w-12 text-indigo-500/20" />
                )}
              </div>

              <h3 className="text-lg font-black text-slate-900">
                {lang === 'bn' ? selectedProduct.titleBn : selectedProduct.title}
              </h3>

              <div className="flex items-center justify-between mt-2.5 pb-3 border-b border-slate-100">
                <span className="text-xl font-black text-indigo-600">৳{selectedProduct.price.toLocaleString()}</span>
                <span className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full font-black">
                  {lang === 'bn' ? `স্টক আছে: ${selectedProduct.stock} টি` : `${selectedProduct.stock} items remaining`}
                </span>
              </div>

              {/* Description */}
              <div className="py-4 space-y-1">
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                  {lang === 'bn' ? 'পণ্য বিবরণ' : 'Product Details'}
                </h4>
                <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                  {lang === 'bn' ? selectedProduct.descriptionBn : selectedProduct.description}
                </p>
              </div>

              {/* Checkout CTA */}
              <button
                onClick={() => {
                  setCheckoutProduct(selectedProduct);
                  setQuantity(1);
                }}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-indigo-500/20 active:scale-95"
              >
                <ShoppingCart className="h-4.5 w-4.5" />
                <span>{lang === 'bn' ? 'অর্ডার করুন' : 'Purchase Now'}</span>
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Checkout Form Modal */}
      <AnimatePresence>
        {checkoutProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-slate-900/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="bg-white rounded-t-[2.5rem] md:rounded-[2.5rem] p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                  <ShoppingCart className="h-4.5 w-4.5 text-indigo-600" />
                  {lang === 'bn' ? 'অর্ডার নিশ্চিতকরণ' : 'Confirm Purchase Order'}
                </h3>
                <button
                  onClick={() => setCheckoutProduct(null)}
                  className="p-2 hover:bg-slate-100 rounded-full cursor-pointer transition-all active:scale-90"
                >
                  <X className="h-5 w-5 text-slate-500" />
                </button>
              </div>

              {/* Checkout Summary info */}
              <div className="bg-slate-50 rounded-2xl p-4 flex gap-3 mb-4">
                <div className="h-14 w-14 rounded-xl bg-white border border-slate-100 shrink-0 overflow-hidden flex items-center justify-center">
                  {checkoutProduct.imageUrl ? (
                    <img src={checkoutProduct.imageUrl} alt={checkoutProduct.title} referrerPolicy="no-referrer" className="object-cover w-full h-full" />
                  ) : (
                    <ShoppingBag className="h-6 w-6 text-indigo-500/30" />
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-800">
                    {lang === 'bn' ? checkoutProduct.titleBn : checkoutProduct.title}
                  </h4>
                  <p className="text-xs font-black text-indigo-600 mt-1">৳{checkoutProduct.price.toLocaleString()}</p>
                </div>
              </div>

              <form onSubmit={handlePlaceOrder} className="space-y-4">
                {/* Quantity adjustor */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    {lang === 'bn' ? 'পরিমাণ (পিস):' : 'Quantity (Units):'}
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={quantity <= 1}
                      onClick={() => setQuantity(q => q - 1)}
                      className="h-10 w-10 bg-slate-100 text-slate-600 rounded-xl font-bold flex items-center justify-center cursor-pointer hover:bg-slate-200 transition-all active:scale-90 disabled:opacity-50"
                    >
                      -
                    </button>
                    <span className="text-sm font-black text-slate-800 w-8 text-center">{quantity}</span>
                    <button
                      type="button"
                      disabled={quantity >= checkoutProduct.stock}
                      onClick={() => setQuantity(q => q + 1)}
                      className="h-10 w-10 bg-slate-100 text-slate-600 rounded-xl font-bold flex items-center justify-center cursor-pointer hover:bg-slate-200 transition-all active:scale-90 disabled:opacity-50"
                    >
                      +
                    </button>
                    <span className="text-[10px] text-slate-400 font-bold ml-1">
                      {lang === 'bn' ? `(সর্বোচ্চ ${checkoutProduct.stock} পিস)` : `(Max ${checkoutProduct.stock} items)`}
                    </span>
                  </div>
                </div>

                {/* Delivery details */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-indigo-600" />
                    {lang === 'bn' ? 'ডেলিভারি ঠিকানা:' : 'Delivery Address:'}
                  </label>
                  <textarea
                    required
                    rows={2}
                    placeholder={lang === 'bn' ? 'আপনার পূর্ণ ঠিকানা এবং থানা/জেলা লিখুন...' : 'Enter full physical address or digital profile email...'}
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="w-full bg-slate-100 border-none rounded-2xl p-3 text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20 text-slate-800"
                  />
                </div>

                {/* Contact phone */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-indigo-600" />
                    {lang === 'bn' ? 'সচল মোবাইল নম্বর:' : 'Contact Mobile Number:'}
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder={lang === 'bn' ? 'যেমন: 01xxxxxxxxx' : 'e.g., 01xxxxxxxxx'}
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full bg-slate-100 border-none rounded-2xl py-3 px-4 text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20 text-slate-800"
                  />
                </div>

                {/* Order Notes */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    {lang === 'bn' ? 'অতিরিক্ত তথ্য (ঐচ্ছিক):' : 'Additional Information (Optional):'}
                  </label>
                  <input
                    type="text"
                    placeholder={lang === 'bn' ? 'কোনো বিশেষ নির্দেশনা থাকলে লিখুন...' : 'Write extra requests or size/spec limits...'}
                    value={orderNote}
                    onChange={(e) => setOrderNote(e.target.value)}
                    className="w-full bg-slate-100 border-none rounded-2xl py-3 px-4 text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20 text-slate-800"
                  />
                </div>

                {/* Balance validation indicator */}
                <div className="border-t border-dashed border-slate-200 pt-3 flex justify-between items-center">
                  <div>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">{lang === 'bn' ? 'সর্বমোট মূল্য' : 'Total Price'}</p>
                    <p className="text-base font-black text-indigo-600">৳{(checkoutProduct.price * quantity).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] text-slate-400 font-bold uppercase">{lang === 'bn' ? 'আপনার ব্যালেন্স' : 'Your Balance'}</p>
                    <p className={`text-xs font-black ${walletBalance >= (checkoutProduct.price * quantity) ? 'text-emerald-600' : 'text-rose-600'}`}>
                      ৳{walletBalance.toLocaleString()}
                    </p>
                  </div>
                </div>

                {walletBalance < (checkoutProduct.price * quantity) && (
                  <div className="bg-rose-50 border border-rose-100 rounded-2xl p-3 text-rose-700 text-[10px] font-semibold flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
                    <span>{lang === 'bn' ? 'অপর্যাপ্ত ওয়ালেট ব্যালেন্স! দয়া করে ব্যালেন্স যোগ করুন।' : 'Insufficient balance in your account! Please add funds.'}</span>
                  </div>
                )}

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isSubmitting || walletBalance < (checkoutProduct.price * quantity)}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 shadow-md shadow-indigo-500/10"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>{lang === 'bn' ? 'অর্ডার প্রসেস হচ্ছে...' : 'Processing Order...'}</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span>{lang === 'bn' ? 'অর্ডার প্লেস করুন' : 'Confirm Order placement'}</span>
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Order Success Confirmed Modal */}
      <AnimatePresence>
        {orderSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2.5rem] p-6 w-full max-w-sm shadow-2xl text-center space-y-4"
            >
              <div className="mx-auto h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-9 w-9" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  {lang === 'bn' ? 'অর্ডার সফলভাবে জমা হয়েছে!' : 'Order Placed Successfully!'}
                </h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  {lang === 'bn' ? 'আপনার অর্ডার রিকোয়েস্টটি এডমিনের কাছে পাঠানো হয়েছে। খুব শীঘ্রই এটি ভেরিফাই করে ডেলিভারি দেওয়া হবে।' : 'Your order request has been logged. The administrator will verify and ship your order shortly.'}
                </p>
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 mt-3 text-left">
                  <p className="text-[10px] text-slate-400 font-bold">ORDER ID:</p>
                  <p className="text-xs font-mono font-bold text-slate-700">{orderSuccess}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setOrderSuccess(null);
                  setActiveTab('orders');
                }}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-2xl font-black text-xs transition-all cursor-pointer active:scale-95 shadow-sm"
              >
                {lang === 'bn' ? 'আমার অর্ডার ট্র্যাক করুন' : 'Track My Order'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
