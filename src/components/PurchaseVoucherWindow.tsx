import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Product, Supplier, PurchaseVoucher, VoucherItem } from '../types';
import { getStorageJson, getStorageString, saveData, saveJson } from '../services/localDb';

interface PurchaseVoucherWindowProps {
  products: Product[];
  suppliers: Supplier[];
  purchases: PurchaseVoucher[];
  onAddPurchase: (voucher: PurchaseVoucher) => void;
  onUpdatePurchase?: (id: string, updatedVoucher: PurchaseVoucher) => void;
  onDeletePurchase: (id: string) => void;
  onClose: () => void;
  onProductsUpdate?: (updatedProducts: Product[]) => void;
  onAddSupplier?: (supplier: Supplier) => void;
  createdFamilles?: string[];
  onCreatedFamillesChange?: (familles: string[] | ((prev: string[]) => string[])) => void;
}

export default function PurchaseVoucherWindow({
  products,
  suppliers,
  purchases,
  onAddPurchase,
  onUpdatePurchase,
  onDeletePurchase,
  onClose,
  onProductsUpdate,
  onAddSupplier,
  createdFamilles: propCreatedFamilles,
  onCreatedFamillesChange
}: PurchaseVoucherWindowProps) {
  // Navigation / Selection of historical vouchers
  const [selectedVoucherId, setSelectedVoucherId] = useState<string>(
    purchases.length > 0 ? purchases[purchases.length - 1].id : ''
  );
  
  // Mode state: 'view' or 'create'
  const [mode, setMode] = useState<'view' | 'create'>('view');

  // New Voucher Draft State
  const [newVoucherId, setNewVoucherId] = useState('');
  const [newDate, setNewDate] = useState(() => {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  });
  const [newTime, setNewTime] = useState(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
  });
  const [newSupplierName, setNewSupplierName] = useState('');
  const [draftItems, setDraftItems] = useState<VoucherItem[]>([]);
  const [versement, setVersement] = useState<number>(0);
  
  // Highlighting/selection state for drafting table
  const [selectedDraftIdx, setSelectedDraftIdx] = useState<number>(-1);

  // Custom Barcode input/filter simulator state
  const [barcodeInput, setBarcodeInput] = useState('');

  // Local specific-bon search states
  const [localSearchOpen, setLocalSearchOpen] = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState('');

  // Supplier selector modal states
  const [isSupplierSelectOpen, setIsSupplierSelectOpen] = useState(false);
  const [supplierSelectType, setSupplierSelectType] = useState<'existing' | 'new'>('existing');
  const [existingSupplierSelected, setExistingSupplierSelected] = useState('');
  
  // New Supplier form states on-the-fly
  const [quickSupplierName, setQuickSupplierName] = useState('');
  const [quickSupplierCode, setQuickSupplierCode] = useState('');
  
  // Voucher editing state tracker
  const [editingVoucherId, setEditingVoucherId] = useState<string | null>(null);

  // Dynamic list of Families created manually by user, persisted through the local DB adapter as fallback
  const [localCreatedFamilles, setLocalCreatedFamilles] = useState<string[]>(() => {
    return getStorageJson('compos_familles', []);
  });

  const createdFamilles = propCreatedFamilles !== undefined ? propCreatedFamilles : localCreatedFamilles;

  const setCreatedFamilles = (updater: string[] | ((prev: string[]) => string[])) => {
    if (onCreatedFamillesChange) {
      onCreatedFamillesChange(updater);
    } else {
      setLocalCreatedFamilles(updater);
    }
  };

  // Keep it sync'd if using fallback local state
  useEffect(() => {
    if (propCreatedFamilles === undefined) {
      saveJson('compos_familles', localCreatedFamilles);
    }
  }, [localCreatedFamilles, propCreatedFamilles]);

  // Combine manually created families with actual product categories from existing products to form families list
  const familles = useMemo(() => {
    const fromProducts = products
      .map(p => p.category)
      .filter((cat): cat is string => !!cat && cat.trim().length > 0)
      .map(cat => cat.toUpperCase());
    return Array.from(new Set([...createdFamilles, ...fromProducts])).sort();
  }, [createdFamilles, products]);

  // Support inline block-free addition of families
  const [isAddingNewFamille, setIsAddingNewFamille] = useState(false);
  const [newFamilleInput, setNewFamilleInput] = useState('');

  // Family Management Popup Modal states
  const [isManagingFamilies, setIsManagingFamilies] = useState(false);
  const [newFamilyInputName, setNewFamilyInputName] = useState('');
  const [editingFamilyName, setEditingFamilyName] = useState<string | null>(null);
  const [editingFamilyValue, setEditingFamilyValue] = useState('');
  const [confirmDeleteFam, setConfirmDeleteFam] = useState<string | null>(null);

  const handleRenameFamily = (oldName: string, newName: string) => {
    const normalizedOld = oldName.trim().toUpperCase();
    const normalizedNew = newName.trim().toUpperCase();
    if (!normalizedNew || normalizedOld === normalizedNew) return;

    // 1. Update createdFamilles list
    setCreatedFamilles(prev => {
      const updated = prev.map(f => f.toUpperCase() === normalizedOld ? normalizedNew : f);
      if (!updated.includes(normalizedNew)) {
        updated.push(normalizedNew);
      }
      return Array.from(new Set(updated)).sort();
    });

    // 2. Update products in parent state
    if (onProductsUpdate) {
      const updatedProducts = products.map(p => {
        if (p.category && p.category.toUpperCase() === normalizedOld) {
          return { ...p, category: normalizedNew };
        }
        return p;
      });
      onProductsUpdate(updatedProducts);
    }

    // Update active form's category if it matches
    if (prodFamille.toUpperCase() === normalizedOld) {
      setProdFamille(normalizedNew);
    }
  };

  const handleDeleteFamily = (famName: string) => {
    const normalizedFam = famName.trim().toUpperCase();

    // 1. Update createdFamilles list
    setCreatedFamilles(prev => prev.filter(f => f.toUpperCase() !== normalizedFam));

    // 2. Update products in parent state
    if (onProductsUpdate) {
      const updatedProducts = products.map(p => {
        if (p.category && p.category.toUpperCase() === normalizedFam) {
          return { ...p, category: '' };
        }
        return p;
      });
      onProductsUpdate(updatedProducts);
    }

    // Update active form's category if it matches
    if (prodFamille.toUpperCase() === normalizedFam) {
      setProdFamille('');
    }
  };

  // Mode de paiement modal states
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [paymentMode, setPaymentMode] = useState('ESPECE');
  const [paymentSource, setPaymentSource] = useState('COFFRE N°1');
  const [paymentVersement, setPaymentVersement] = useState<number>(0);

  // Resizable proportions / sections
  const [topSplitWidth, setTopSplitWidth] = useState<number>(() => {
    return Number(getStorageString('achats_top_split_width')) || 68; // percentage for Registre des Bons
  });
  const [bottomSplitWidth, setBottomSplitWidth] = useState<number>(() => {
    return Number(getStorageString('achats_bottom_split_width')) || 68; // percentage for Articles List
  });
  const [topSectionHeight, setTopSectionHeight] = useState<number>(() => {
    return Number(getStorageString('achats_top_section_height')) || 155; // height in pixels of Registre section
  });
  const [bottomSectionHeight, setBottomSectionHeight] = useState<number>(() => {
    return Number(getStorageString('achats_bottom_section_height')) || 170; // height in pixels of Articles section
  });

  const [isResizingTopHeight, setIsResizingTopHeight] = useState(false);
  const [isResizingBottomHeight, setIsResizingBottomHeight] = useState(false);
  const [isResizingTopWidth, setIsResizingTopWidth] = useState(false);
  const [isResizingBottomWidth, setIsResizingBottomWidth] = useState(false);

  // Absolute coordinate tracking ref
  const resizeStartRef = useRef({
    x: 0,
    y: 0,
    topHeight: 155,
    bottomHeight: 170,
    topWidth: 68,
    bottomWidth: 68
  });

  // Track current resize coordinates in a ref to bypass CPU-bound synchronous disk I/O on pointermove
  const currentHeightWidthRef = useRef({
    topSectionHeight: 155,
    bottomSectionHeight: 170,
    topSplitWidth: 68,
    bottomSplitWidth: 68
  });

  useEffect(() => {
    currentHeightWidthRef.current.topSectionHeight = topSectionHeight;
  }, [topSectionHeight]);
  useEffect(() => {
    currentHeightWidthRef.current.bottomSectionHeight = bottomSectionHeight;
  }, [bottomSectionHeight]);
  useEffect(() => {
    currentHeightWidthRef.current.topSplitWidth = topSplitWidth;
  }, [topSplitWidth]);
  useEffect(() => {
    currentHeightWidthRef.current.bottomSplitWidth = bottomSplitWidth;
  }, [bottomSplitWidth]);

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (isResizingTopHeight) {
        const deltaY = e.clientY - resizeStartRef.current.y;
        const val = Math.max(80, Math.min(600, resizeStartRef.current.topHeight + deltaY));
        setTopSectionHeight(val);
        currentHeightWidthRef.current.topSectionHeight = val;
      }
      if (isResizingBottomHeight) {
        const deltaY = e.clientY - resizeStartRef.current.y;
        const val = Math.max(80, Math.min(650, resizeStartRef.current.bottomHeight + deltaY));
        setBottomSectionHeight(val);
        currentHeightWidthRef.current.bottomSectionHeight = val;
      }
      if (isResizingTopWidth) {
        const element = document.getElementById('top-row-container');
        if (element) {
          const rect = element.getBoundingClientRect();
          const val = Math.max(15, Math.min(92, ((e.clientX - rect.left) / rect.width) * 100));
          setTopSplitWidth(val);
          currentHeightWidthRef.current.topSplitWidth = val;
        }
      }
      if (isResizingBottomWidth) {
        const element = document.getElementById('bottom-row-container');
        if (element) {
          const rect = element.getBoundingClientRect();
          const val = Math.max(15, Math.min(92, ((e.clientX - rect.left) / rect.width) * 100));
          setBottomSplitWidth(val);
          currentHeightWidthRef.current.bottomSplitWidth = val;
        }
      }
    };

    const handlePointerUp = () => {
      if (isResizingTopHeight) {
        saveData('achats_top_section_height', String(currentHeightWidthRef.current.topSectionHeight));
      }
      if (isResizingBottomHeight) {
        saveData('achats_bottom_section_height', String(currentHeightWidthRef.current.bottomSectionHeight));
      }
      if (isResizingTopWidth) {
        saveData('achats_top_split_width', String(currentHeightWidthRef.current.topSplitWidth));
      }
      if (isResizingBottomWidth) {
        saveData('achats_bottom_split_width', String(currentHeightWidthRef.current.bottomSplitWidth));
      }
      setIsResizingTopHeight(false);
      setIsResizingBottomHeight(false);
      setIsResizingTopWidth(false);
      setIsResizingBottomWidth(false);
    };

    if (isResizingTopHeight || isResizingBottomHeight || isResizingTopWidth || isResizingBottomWidth) {
      document.addEventListener('pointermove', handlePointerMove);
      document.addEventListener('pointerup', handlePointerUp);
    }
    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isResizingTopHeight, isResizingBottomHeight, isResizingTopWidth, isResizingBottomWidth]);

  // PRODUIT (Product) Modal State
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [isCatalogSearchOpen, setIsCatalogSearchOpen] = useState(false);
  const [selectedSearchProduct, setSelectedSearchProduct] = useState<Product | null>(null);
  const [dialogMode, setDialogMode] = useState<'add_new' | 'insert_existing' | 'edit_existing'>('add_new');

  // Local transaction-based product list to avoid mutating global products catalog on cancel
  const [localProducts, setLocalProducts] = useState<Product[]>([]);

  // Synchronize local products when in view mode
  useEffect(() => {
    if (mode === 'view') {
      setLocalProducts(products);
    }
  }, [products, mode]);

  // CUSTOM RETRO DIALOG BOX STATE (to completely bypass blocked iframe alert/confirm modals)
  const [retroDialog, setRetroDialog] = useState<{
    isOpen: boolean;
    type: 'alert' | 'confirm';
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({
    isOpen: false,
    type: 'alert',
    title: '',
    message: ''
  });

  const showRetroAlert = (message: string, title = "VBI PME - Message") => {
    setRetroDialog({
      isOpen: true,
      type: 'alert',
      title,
      message
    });
  };

  const showRetroConfirm = (message: string, onConfirm: () => void, title = "VBI PME - Confirmation") => {
    setRetroDialog({
      isOpen: true,
      type: 'confirm',
      title,
      message,
      onConfirm
    });
  };
  const [activeDialogTab, setActiveDialogTab] = useState<'general' | 'plus_info' | 'photo'>('general');
  const [selectedCatalogProductCode, setSelectedCatalogProductCode] = useState(''); // for insert_existing
  const [insertSearchQuery, setInsertSearchQuery] = useState(''); // Search query for previous products to insert

  // Modal Form Inputs
  const [prodCode, setProdCode] = useState('');
  const [prodFamille, setProdFamille] = useState('');
  const [prodDesignation, setProdDesignation] = useState('');
  const [prodStockEnStock, setProdStockEnStock] = useState(0);
  const [prodPrixDeRevient, setProdPrixDeRevient] = useState(0);
  
  const [prodNbreColis, setProdNbreColis] = useState(''); // Always blank by default as requested
  const [prodColisage, setProdColisage] = useState(''); // Always blank by default as requested
  const [prodQtyCalculated, setProdQtyCalculated] = useState(0);
  const [prodPrixAchat, setProdPrixAchat] = useState('0');
  const [prodNouveauPrixRevient, setProdNouveauPrixRevient] = useState('0'); // Has its own state now
  const [prodPrixVente1, setProdPrixVente1] = useState('0');
  const [prodPrixVente2, setProdPrixVente2] = useState('0');
  const [prodPrixVente3, setProdPrixVente3] = useState('0');

  // Custom details for F2 (Plus d'info) tab
  const [infoRayon, setInfoRayon] = useState('A-1');
  const [infoUnite, setInfoUnite] = useState('Boite');
  const [infoTvaPercent, setInfoTvaPercent] = useState('0');
  const [infoAlerteStock, setInfoAlerteStock] = useState('5');

  // Calculates dynamically weighted average cost price on the fly for UI
  const calculatedNouveauPrixRevient = useMemo(() => {
    const qtyVal = Number(prodQtyCalculated) || 0;
    const buyPriceVal = Number(prodPrixAchat) || 0;
    const existingStock = prodStockEnStock || 0;
    const existingCost = prodPrixDeRevient || 0;

    if (existingStock <= 0 || existingCost <= 0) {
      return buyPriceVal;
    }
    if (qtyVal <= 0) {
      return existingCost;
    }
    return Math.round(((existingStock * existingCost) + (qtyVal * buyPriceVal)) / (existingStock + qtyVal));
  }, [prodQtyCalculated, prodPrixAchat, prodStockEnStock, prodPrixDeRevient]);

  // Filters the list of catalog items dynamically for insert dialog
  const filteredProductsToInsert = useMemo(() => {
    const q = insertSearchQuery.trim().toLowerCase();
    if (!q) return localProducts;
    return localProducts.filter(p => 
      p.code.toLowerCase().includes(q) || 
      p.designation.toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q)
    );
  }, [localProducts, insertSearchQuery]);

  // Set active voucher index for pager buttons
  const activeVoucherIndex = purchases.findIndex(v => v.id === selectedVoucherId);

  const selectedVoucher = useMemo(() => {
    if (mode === 'create') return null;
    return purchases.find(v => v.id === selectedVoucherId) || purchases[purchases.length - 1] || null;
  }, [purchases, selectedVoucherId, mode]);

  // Keep selectedVoucherId valid and synchronized with current purchases
  useEffect(() => {
    if (mode === 'view') {
      if (purchases.length === 0) {
        setSelectedVoucherId('');
      } else {
        const found = purchases.some(v => v.id === selectedVoucherId);
        if (!found) {
          setSelectedVoucherId(purchases[purchases.length - 1].id);
        }
      }
    }
  }, [purchases, selectedVoucherId, mode]);

  // Handle pagination between historical voucher records
  const handleFirst = () => {
    if (purchases.length > 0) setSelectedVoucherId(purchases[0].id);
  };
  const handlePrev = () => {
    if (activeVoucherIndex > 0) setSelectedVoucherId(purchases[activeVoucherIndex - 1].id);
  };
  const handleNext = () => {
    if (activeVoucherIndex < purchases.length - 1) setSelectedVoucherId(purchases[activeVoucherIndex + 1].id);
  };
  const handleLast = () => {
    if (purchases.length > 0) setSelectedVoucherId(purchases[purchases.length - 1].id);
  };

  // Find supplier object for calculations
  const selectedSupplierObj = useMemo(() => {
    const name = mode === 'create' ? newSupplierName : selectedVoucher?.supplier;
    return suppliers.find(s => s.name === name) || null;
  }, [suppliers, newSupplierName, selectedVoucher, mode]);

  // Calculated draft metrics
  const draftMetrics = useMemo(() => {
    let rawAmount = 0;
    let totalQty = 0;
    draftItems.forEach(item => {
      rawAmount += item.total;
      totalQty += item.qty;
    });

    const totalHT = rawAmount;
    const tva = 0; 
    const timbre = 0; // Disabled as requested: Timbre is always zero 
    const ttc = totalHT + tva + timbre;

    let oldBalance = selectedSupplierObj ? selectedSupplierObj.balance : 0;
    
    // Adjust old balance if we are editing an existing voucher by subtracting the original voucher's net impact
    if (editingVoucherId && selectedVoucher && selectedSupplierObj) {
      if (selectedSupplierObj.name === selectedVoucher.supplier) {
        oldBalance = Math.max(0, selectedSupplierObj.balance - (selectedVoucher.ttc - (selectedVoucher.versement || 0)));
      }
    }

    const newBalance = oldBalance + (ttc - versement);

    return { rawAmount, totalQty, totalHT, tva, timbre, ttc, oldBalance, newBalance };
  }, [draftItems, selectedSupplierObj, versement, editingVoucherId, selectedVoucher]);

  // Starts voucher creation flow
  const handleNewVoucher = () => {
    setIsSupplierSelectOpen(true);
    if (suppliers.length > 0) {
      setSupplierSelectType('existing');
      setExistingSupplierSelected(suppliers[0].name);
    } else {
      setSupplierSelectType('new');
      setExistingSupplierSelected('');
    }
    setQuickSupplierName('');
    const nextCodeNum = String(suppliers.length + 1).padStart(3, '0');
    setQuickSupplierCode(`F-${nextCodeNum}`);
  };

  const handleConfirmSupplierForVoucher = () => {
    let finalSupplierName = '';

    if (supplierSelectType === 'new') {
      if (!quickSupplierName.trim()) {
        showRetroAlert("Veuillez saisir le nom du nouveau fournisseur.");
        return;
      }
      // Check duplicate
      const exists = suppliers.some(s => s.name.toLowerCase() === quickSupplierName.trim().toLowerCase());
      if (exists) {
        showRetroAlert("Ce fournisseur existe déjà !");
        return;
      }

      const newSupplierObj: Supplier = {
        id: Math.random().toString(),
        code: quickSupplierCode.trim() || `F-${String(suppliers.length + 1).padStart(3, '0')}`,
        name: quickSupplierName.trim(),
        balance: 0
      };

      if (onAddSupplier) {
        onAddSupplier(newSupplierObj);
      }
      finalSupplierName = newSupplierObj.name;
    } else {
      if (!existingSupplierSelected) {
        showRetroAlert("Veuillez sélectionner un fournisseur.");
        return;
      }
      finalSupplierName = existingSupplierSelected;
    }

    // Now proceed with normal voucher initialization
    const nextNum = (purchases.length > 0) 
      ? String(Number(purchases[purchases.length - 1].id) + 1).padStart(5, '0')
      : '02104';
    
    setLocalProducts([...products]);
    setNewVoucherId(nextNum);
    setEditingVoucherId(null); // Reset when creating new
    
    const d = new Date();
    setNewDate(`${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`);
    setNewTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`);
    
    setNewSupplierName(finalSupplierName);
    setDraftItems([]);
    setVersement(0);
    setBarcodeInput('');
    setSelectedDraftIdx(-1);
    setIsSupplierSelectOpen(false);
    setMode('create');
  };

  // Modify an existing closed voucher
  const handleEditVoucher = () => {
    if (!selectedVoucher) {
      showRetroAlert("Aucun bon d'achat sélectionné.");
      return;
    }

    // De-integrate this voucher's quantities and prices from the catalog products to revert to original state before editing
    const revertedProducts = products.map(p => {
      const item = selectedVoucher.items.find(i => i.code === p.code);
      if (item) {
        const revStock = Math.max(0, p.stock - item.qty);
        let revCost = p.prixDeRevient;
        if (revStock > 0 && p.prixDeRevient !== undefined) {
          revCost = Math.round((p.prixDeRevient * p.stock - item.qty * item.price) / revStock);
        }
        return {
          ...p,
          stock: revStock,
          stockColis: Math.ceil(revStock / 12),
          prixDeRevient: revCost
        };
      }
      return p;
    });

    setLocalProducts(revertedProducts);
    setEditingVoucherId(selectedVoucher.id);
    setNewVoucherId(selectedVoucher.id);
    setNewDate(selectedVoucher.date);
    setNewTime(selectedVoucher.time);
    setNewSupplierName(selectedVoucher.supplier);
    setDraftItems([...selectedVoucher.items]);
    setVersement(selectedVoucher.versement || 0);
    setBarcodeInput('');
    setSelectedDraftIdx(selectedVoucher.items.length > 0 ? 0 : -1);
    setIsSupplierSelectOpen(false);
    setMode('create');
  };

  // Safe barcode scanner direct helper
  const handleAddScannedProduct = (productCode: string) => {
    if (!productCode.trim()) return;
    const targetProduct = localProducts.find(p => p.code === productCode.trim());
    if (!targetProduct) {
      // Direct integration: if code doesn't exist, open PRODUIT modal to register it on the fly!
      handleOpenProductDialog('add_new', productCode.trim());
      setBarcodeInput('');
      return;
    }

    // Auto-calculates a fallback purchase price (72% of standard PrixVente1)
    const purchasePrice = Math.round(targetProduct.prixVente1 * 0.72) || 100;

    const existingIndex = draftItems.findIndex(item => item.code === targetProduct.code);
    if (existingIndex >= 0) {
      const updated = [...draftItems];
      updated[existingIndex].qty += 1;
      updated[existingIndex].total = updated[existingIndex].qty * updated[existingIndex].price;
      setDraftItems(updated);
      setSelectedDraftIdx(existingIndex);
    } else {
      const newItem: VoucherItem = {
        id: Math.random().toString(),
        code: targetProduct.code,
        designation: targetProduct.designation,
        colisage: 12,
        nbreColis: 1,
        pieces: 0,
        qty: 12, // Default to a whole carton of 12
        price: purchasePrice,
        total: 12 * purchasePrice
      };
      const updated_items = [...draftItems, newItem];
      setDraftItems(updated_items);
      setSelectedDraftIdx(updated_items.length - 1);
    }
    setBarcodeInput('');
  };

  const handleRemoveDraftItem = (index: number) => {
    if (index < 0 || index >= draftItems.length) return;
    const itemToRemove = draftItems[index];
    showRetroConfirm(
      `Voulez-vous supprimer l'article ${itemToRemove.designation} de ce bon ?`,
      () => {
        const updated = draftItems.filter((_, idx) => idx !== index);
        setDraftItems(updated);
        setSelectedDraftIdx(updated.length > 0 ? updated.length - 1 : -1);

        // Revert product cost price / existence in draft localProducts catalog
        const originalProd = products.find(p => p.code === itemToRemove.code);
        if (originalProd) {
          setLocalProducts(prev => prev.map(p => 
            p.code === itemToRemove.code 
              ? { ...p, prixDeRevient: originalProd.prixDeRevient } 
              : p
          ));
        } else {
          // If it was newly registered in this session, remove it entirely from localProducts catalog
          setLocalProducts(prev => prev.filter(p => p.code !== itemToRemove.code));
        }
      },
      "Suppression d'article"
    );
  };

  // Opens Mode de paiement popup instead of saving directly
  const handleSaveVoucher = () => {
    if (draftItems.length === 0) {
      showRetroAlert('Veuillez ajouter au moins un produit.');
      return;
    }
    
    // Determine payment mode and pre-filled versement
    // If the main column's versement is 0, default to credit 'A_TERME'
    const defaultMode = (versement === 0) ? 'A_TERME' : 'ESPECE';
    
    setPaymentVersement(versement);
    setPaymentSource('COFFRE N°1');
    setPaymentMode(defaultMode);
    setIsPaymentDialogOpen(true);
  };

  // Handles finalized payment confirmation from the retro modal popup
  const handleConfirmPaymentAndSaveVoucher = () => {
    const finalVersement = Number(paymentVersement) || 0;
    
    // Recalculate newBalance with the final versement from the dialog
    const finalNewBalance = draftMetrics.oldBalance + (draftMetrics.ttc - finalVersement);

    const savedVoucher: PurchaseVoucher = {
      id: newVoucherId,
      date: newDate,
      time: newTime,
      supplier: newSupplierName,
      itemsCount: draftItems.length,
      colisCount: draftItems.reduce((acc, t) => acc + (t.nbreColis || 0), 0),
      amount: draftMetrics.rawAmount,
      remise: 0,
      totalHT: draftMetrics.totalHT,
      tva: draftMetrics.tva,
      timbre: draftMetrics.timbre,
      ttc: draftMetrics.ttc,
      versement: finalVersement,
      oldBalance: draftMetrics.oldBalance,
      newBalance: finalNewBalance,
      items: draftItems
    };

    // Update the on-screen versement field to align with the dialog choice
    setVersement(finalVersement);

    // Calculate final products with both updated stocks and updated cost prices (weighted average cost / CUMP)
    const finalizedProducts = localProducts.map(p => {
      const voucherItem = savedVoucher.items.find(item => item.code === p.code);
      if (voucherItem) {
        const finalStock = p.stock + voucherItem.qty;
        
        // Calculate the new weighted average cost dynamically to be 100% correct and up to date
        const oldStock = p.stock;
        const oldCost = p.prixDeRevient || 0;
        const newCost = voucherItem.price || 0;
        const newQty = voucherItem.qty || 0;

        let finalCostPrice = oldCost;
        if (oldStock <= 0 || oldCost <= 0) {
          finalCostPrice = newCost;
        } else if (newQty > 0) {
          finalCostPrice = Math.round(((oldStock * oldCost) + (newQty * newCost)) / (oldStock + newQty));
        }

        return {
          ...p,
          stock: finalStock,
          stockColis: Math.ceil(finalStock / (voucherItem.colisage || 12)),
          prixDeRevient: finalCostPrice,
          prixAchat: voucherItem.price
        };
      }
      return p;
    });

    if (editingVoucherId) {
      if (onUpdatePurchase) {
        onUpdatePurchase(editingVoucherId, savedVoucher);
      }
      showRetroAlert(`Bon d'Achat N° ${savedVoucher.id} modifié avec succès!`);
    } else {
      onAddPurchase(savedVoucher);
      showRetroAlert(`Bon d'Achat N° ${savedVoucher.id} enregistré avec succès!`);
    }

    if (onProductsUpdate) {
      onProductsUpdate(finalizedProducts);
    }

    setSelectedVoucherId(savedVoucher.id);
    setEditingVoucherId(null);
    setMode('view');
    setIsPaymentDialogOpen(false);
  };

  // Delete Voucher
  const handleDeleteVoucher = () => {
    if (!selectedVoucher) return;
    showRetroConfirm(
      `Voulez-vous vraiment supprimer définitivement le Bon d'Achat N° ${selectedVoucher.id} ?\n\nCette action rétablira le stock des articles et ajustera le solde du fournisseur (${selectedVoucher.supplier}) automatiquement.`,
      () => {
        const idToDelete = selectedVoucher.id;
        // Pre-calculate remaining list of purchases to select the correct next active one
        const remaining = purchases.filter(p => String(p.id) !== String(idToDelete));
        const nextActiveId = remaining.length > 0 ? remaining[remaining.length - 1].id : '';
        
        onDeletePurchase(idToDelete);
        setSelectedVoucherId(nextActiveId);
        showRetroAlert(`Le Bon d'Achat N° ${idToDelete} a été retiré de la base de données.`);
      },
      "Suppression du bon d'achat"
    );
  };

  // Generates unique barcode strictly between 1000000000000 and 1019999999999
  const generateRandom13DigitBarcode = () => {
    const existingCodes = new Set(products.map(p => p.code));
    let code = '';
    const min = 1000000000000;
    const max = 1019999999999;
    for (let attempt = 0; attempt < 10000; attempt++) {
      const randVal = Math.floor(Math.random() * (max - min + 1)) + min;
      const candidate = randVal.toString();
      if (!existingCodes.has(candidate)) {
        code = candidate;
        break;
      }
    }
    return code;
  };

  // Open PRODUIT Modal settings
  const handleOpenProductDialog = (
    modeType: 'add_new' | 'insert_existing' | 'edit_existing',
    fallbackOrPrefilledBarcode: string = ''
  ) => {
    setDialogMode(modeType);
    setActiveDialogTab('general');
    setInsertSearchQuery(''); // Reset search query on open

    if (modeType === 'add_new') {
      const generated = fallbackOrPrefilledBarcode || generateRandom13DigitBarcode();
      setProdCode(generated);
      setProdDesignation('');
      setProdFamille(familles[0] || '');
      setProdStockEnStock(0);
      setProdPrixDeRevient(0);
      setProdNbreColis(''); // Left blank by default as requested
      setProdColisage(''); // Left blank by default as requested
      setProdQtyCalculated(0);
      setProdPrixAchat('');
      setProdNouveauPrixRevient('');
      setProdPrixVente1('');
      setProdPrixVente2(''); // Pastes Vente 1 automatically by default as requested
      setProdPrixVente3(''); // Pastes Vente 1 automatically by default as requested
      setIsProductDialogOpen(true);
    } 
    else if (modeType === 'insert_existing') {
      if (localProducts.length === 0) {
        showRetroAlert("Aucun produit enregistré dans la base.");
        return;
      }
      setSelectedSearchProduct(localProducts[0]);
      setIsCatalogSearchOpen(true);
    } 
    else if (modeType === 'edit_existing') {
      if (selectedDraftIdx < 0 || selectedDraftIdx >= draftItems.length) {
        showRetroAlert("Veuillez sélectionner un article dans le tableau des détails d'abord.");
        return;
      }
      const item = draftItems[selectedDraftIdx];
      // Find matching catalog product
      const catProd = localProducts.find(p => p.code === item.code);

      setProdCode(item.code);
      setProdDesignation(item.designation);
      setProdFamille(catProd && catProd.category ? catProd.category : (familles.length > 0 ? familles[0] : ''));
      setProdStockEnStock(catProd ? catProd.stock : 0);
      setProdPrixDeRevient(catProd && catProd.prixDeRevient !== undefined ? catProd.prixDeRevient : item.price);
      setProdNbreColis(item.nbreColis !== undefined && item.nbreColis !== 0 ? String(item.nbreColis) : '');
      setProdColisage(item.colisage !== undefined && item.colisage !== 0 ? String(item.colisage) : '');
      setProdQtyCalculated(item.qty);
      setProdPrixAchat(String(item.price));
      setProdNouveauPrixRevient(String(item.price));
      setProdPrixVente1(String(catProd ? catProd.prixVente1 : item.price * 1.3));
      setProdPrixVente2(String(catProd ? (catProd.prixVente2 || catProd.prixVente1) : item.price * 1.3));
      setProdPrixVente3(String(catProd ? (catProd.prixVente3 || catProd.prixVente1) : item.price * 1.3));
      setIsProductDialogOpen(true);
    }
  };

  const handleSelectCatalogProduct = (p: Product) => {
    setSelectedCatalogProductCode(p.code);
    setProdCode(p.code);
    setProdDesignation(p.designation);
    setProdFamille(p.category || (familles.length > 0 ? familles[0] : ''));
    setProdStockEnStock(p.stock);
    const prevPriceRev = p.prixDeRevient !== undefined ? p.prixDeRevient : Math.round(p.prixVente1 * 0.72);
    setProdPrixDeRevient(prevPriceRev);
    setProdNbreColis(''); // Left blank as requested
    setProdColisage(''); // Left blank as requested
    setProdQtyCalculated(0);
    setProdPrixAchat(String(prevPriceRev));
    setProdNouveauPrixRevient(String(prevPriceRev));
    setProdPrixVente1(String(p.prixVente1));
    setProdPrixVente2(String(p.prixVente2 || p.prixVente1));
    setProdPrixVente3(String(p.prixVente3 || p.prixVente1));
    setIsCatalogSearchOpen(false);
    setIsProductDialogOpen(true);
  };

  // Trigger when catalog item changes in dropdown of insert modal
  const handleCatalogProductChange = (code: string) => {
    setSelectedCatalogProductCode(code);
    const target = localProducts.find(p => p.code === code);
    if (target) {
      setProdCode(target.code);
      setProdDesignation(target.designation);
      setProdStockEnStock(target.stock);
      setProdFamille(target.category || (familles.length > 0 ? familles[0] : ''));
      const estCost = target.prixDeRevient !== undefined ? target.prixDeRevient : Math.round(target.prixVente1 * 0.72);
      setProdPrixDeRevient(estCost);
      setProdPrixAchat(String(estCost));
      setProdNouveauPrixRevient(String(estCost));
      setProdPrixVente1(String(target.prixVente1));
      setProdPrixVente2(String(target.prixVente2 || target.prixVente1));
      setProdPrixVente3(String(target.prixVente3 || target.prixVente1));
    }
  };

  // Handles updating calculations based on fields
  const handleNbreColisChange = (val: string) => {
    setProdNbreColis(val);
    if (!val) {
      setProdQtyCalculated(0);
      return;
    }
    const n = Number(val) || 0;
    const c = Number(prodColisage) || 12;
    setProdQtyCalculated(n * c);
  };

  const handleColisageChange = (val: string) => {
    setProdColisage(val);
    if (!val) {
      setProdQtyCalculated(0);
      return;
    }
    const n = Number(prodNbreColis) || 0;
    const c = Number(val) || 12;
    setProdQtyCalculated(n * c);
  };

  const handleQtyChange = (val: string) => {
    if (!val) {
      setProdQtyCalculated(0);
      setProdNbreColis('');
      return;
    }
    const qty = Number(val) || 0;
    setProdQtyCalculated(qty);
    const c = Number(prodColisage) || 12;
    setProdNbreColis(qty > 0 ? String(Math.floor(qty / c)) : '');
  };

  // Auto-calculate margin percentage
  const calculateMarginPercent = (sellPriceStr: string, buyPriceStr: string): string => {
    const sell = Number(sellPriceStr) || 0;
    const buy = Number(buyPriceStr) || 0;
    if (buy <= 0) return '0%';
    const pct = ((sell - buy) / buy) * 100;
    return `${pct.toFixed(1)}%`;
  };

  // Save/Add the product from modal
  const handleSaveProductFromModal = () => {
    if (!prodCode.trim()) {
      alert("Le code-barre ou identifiant produit est requis.");
      return;
    }
    if (!prodDesignation.trim()) {
      alert("La désignation du produit est requise.");
      return;
    }

    const cleanCode = prodCode.trim();
    const cleanDesignation = prodDesignation.trim();
    const cost = Number(prodPrixAchat) || 0;
    const qty = Number(prodQtyCalculated) || 0;
    const sp1 = Number(prodPrixVente1) || 0;
    const sp2 = Number(prodPrixVente2) || 0;
    const sp3 = Number(prodPrixVente3) || 0;
    const colNum = Number(prodColisage) || 12;
    const nbreColNum = Number(prodNbreColis) || 0;

    // 1. Registered locally in product catalogue for the duration of this voucher session
    const updatedProducts = [...localProducts];
    const catIdx = updatedProducts.findIndex(p => p.code === cleanCode);
    
    if (catIdx === -1) {
      // Insert new product
      const newCatalogProductObj: Product = {
        code: cleanCode,
        designation: cleanDesignation,
        prixVente1: sp1,
        prixVente2: sp2,
        prixVente3: sp3,
        stock: 0, // Starts catalog template at 0, purchase validation will increment it
        stockColis: 0,
        category: prodFamille,
        prixDeRevient: cost,
        prixAchat: cost
      };
      updatedProducts.push(newCatalogProductObj);
    } else {
      // Update catalog entry (updating designations, edited stocks, and selling prices with weighted average cost price)
      const existingProduct = updatedProducts[catIdx];
      const existingStock = Number(prodStockEnStock) || 0; // Use modified starting stock
      const existingCost = Number(prodPrixDeRevient) || 0; // Use modified starting cost price
      
      let newBalancedCost = cost;
      if (qty <= 0) {
        newBalancedCost = existingCost;
      } else if (existingStock <= 0) {
        newBalancedCost = cost;
      } else {
        newBalancedCost = Math.round(((existingStock * existingCost) + (qty * cost)) / (existingStock + qty));
      }

      updatedProducts[catIdx] = {
        ...existingProduct,
        designation: cleanDesignation,
        stock: existingStock, // Update starting catalog stock!
        stockColis: Math.ceil(existingStock / colNum),
        prixVente1: sp1,
        prixVente2: sp2,
        prixVente3: sp3,
        category: prodFamille,
        prixDeRevient: newBalancedCost,
        prixAchat: cost
      };
    }

    setLocalProducts(updatedProducts);

    // 2. Add/Replace in current voucher items draft
    const existingIndexInVoucherItem = draftItems.findIndex(item => item.code === cleanCode);
    const newVoucherItem: VoucherItem = {
      id: Math.random().toString(),
      code: cleanCode,
      designation: cleanDesignation,
      colisage: colNum,
      nbreColis: nbreColNum,
      pieces: qty % colNum,
      qty: qty,
      price: cost,
      total: qty * cost
    };

    if (existingIndexInVoucherItem >= 0) {
      const updated = [...draftItems];
      updated[existingIndexInVoucherItem] = newVoucherItem;
      setDraftItems(updated);
      setSelectedDraftIdx(existingIndexInVoucherItem);
    } else {
      const updated = [...draftItems, newVoucherItem];
      setDraftItems(updated);
      setSelectedDraftIdx(updated.length - 1);
    }

    setIsProductDialogOpen(false);
  };

  // Handles Keyboards POS Quick Shortcuts
  useEffect(() => {
    const handleGlobalKeydowns = (e: KeyboardEvent) => {
      // Only process keys when current pane is active (i.e. focused / not writing inside key inputs)
      // Check if user is typing on target elements inside some input
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' && !(e.target as HTMLInputElement).readOnly && !isProductDialogOpen && !isPaymentDialogOpen) {
        // Let standard input handle typing, except for Enter barcode
        if (e.key === 'Enter' && (e.target as HTMLInputElement).placeholder.includes('Scanner')) {
          e.preventDefault();
        }
        return;
      }

      if (isCatalogSearchOpen) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setIsCatalogSearchOpen(false);
        }
        return;
      }

      if (isPaymentDialogOpen) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setIsPaymentDialogOpen(false);
        }
        if (e.key === 'Enter' || e.key === 'F5') {
          e.preventDefault();
          handleConfirmPaymentAndSaveVoucher();
        }
        return;
      }

      if (isProductDialogOpen) {
        // Modal hotkeys
        if (e.key === 'Escape') {
          setIsProductDialogOpen(false);
        }
        if (e.key === 'F1') {
          e.preventDefault();
          setActiveDialogTab('general');
        }
        if (e.key === 'F2') {
          e.preventDefault();
          setActiveDialogTab('plus_info');
        }
        if (e.key === 'F3') {
          e.preventDefault();
          setActiveDialogTab('photo');
        }
        return;
      }

      // Main window hotkeys
      if (e.key === 'F1') {
        e.preventDefault();
        if (mode !== 'create') handleNewVoucher();
      }
      if (e.key === 'F2') {
        e.preventDefault();
        if (mode === 'create') {
          setMode('view');
          setEditingVoucherId(null);
        } else {
          onClose();
        }
      }
      if (e.key === 'F4') {
        e.preventDefault();
        if (mode !== 'create') handleEditVoucher();
      }
      if (e.key === 'F5') {
        e.preventDefault();
        if (mode === 'create') handleSaveVoucher();
      }
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        if (mode === 'create') handleOpenProductDialog('add_new');
      }
      if (e.key === 'Enter') {
        if (mode === 'create') {
          e.preventDefault();
          handleOpenProductDialog('insert_existing');
        }
      }
      if (e.key === 'F8') {
        e.preventDefault();
        if (mode === 'create') handleOpenProductDialog('edit_existing');
      }
      if (e.key === 'Delete') {
        if (mode === 'create' && selectedDraftIdx >= 0) {
          e.preventDefault();
          handleRemoveDraftItem(selectedDraftIdx);
        }
      }
      if (e.ctrlKey && (e.key === 'Delete' || e.key === 'Backspace')) {
        if (mode === 'view' && selectedVoucher) {
          e.preventDefault();
          handleDeleteVoucher();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeydowns);
    return () => window.removeEventListener('keydown', handleGlobalKeydowns);
  }, [
    mode, purchases, selectedDraftIdx, draftItems, isProductDialogOpen, isCatalogSearchOpen, localProducts,
    prodCode, prodDesignation, prodPrixVente1, prodPrixAchat, prodQtyCalculated, prodColisage, prodNbreColis,
    isPaymentDialogOpen, paymentVersement, editingVoucherId, paymentMode, paymentSource, draftMetrics,
    selectedVoucher, selectedVoucherId, handleDeleteVoucher
  ]);

  const unfilteredItems = mode === 'create' ? draftItems : (selectedVoucher?.items || []);
  const currentItems = unfilteredItems.filter(item => {
    if (!localSearchQuery.trim()) return true;
    const q = localSearchQuery.toLowerCase().trim();
    return (
      (item.code || '').toLowerCase().includes(q) ||
      (item.designation || '').toLowerCase().includes(q)
    );
  });
  const displayMetrics = mode === 'create' ? draftMetrics : {
    rawAmount: selectedVoucher?.amount || 0,
    totalQty: selectedVoucher?.items?.reduce((acc, t) => acc + t.qty, 0) || 0,
    totalHT: selectedVoucher?.totalHT || 0,
    tva: selectedVoucher?.tva || 0,
    timbre: selectedVoucher?.timbre || 0,
    ttc: selectedVoucher?.ttc || 0,
    oldBalance: selectedVoucher?.oldBalance || 0,
    newBalance: selectedVoucher?.newBalance || 0,
  };

  return (
    <div id="purchases-root-container" className="flex-1 flex flex-col font-sans text-xs bg-slate-50 dark:bg-slate-900/40 text-slate-800 dark:text-slate-100 h-full overflow-hidden select-none outline-none relative">
      
      {/* 1. Header Toolbar Ribbon - Modernized with Material 3 styling */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200/50 dark:border-slate-800/85 gap-2 flex-wrap select-none shadow-xs mb-2">
        
        {/* Navigation Pager controls */}
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200/20 gap-1 shadow-inner">
            <button
              onClick={handleFirst}
              disabled={mode === 'create' || purchases.length === 0}
              className="w-10 h-9 flex flex-col justify-center items-center rounded-lg bg-white dark:bg-slate-900 border border-slate-200/30 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 select-none cursor-pointer"
              title="Premier Bon"
            >
              <span className="text-sm font-sans leading-none text-slate-800 dark:text-sky-400 font-extrabold">⏮</span>
              <span className="text-[7.5px] font-black text-slate-500 uppercase tracking-tight mt-0.5">Début</span>
            </button>
            <button
              onClick={handlePrev}
              disabled={mode === 'create' || activeVoucherIndex <= 0}
              className="w-10 h-9 flex flex-col justify-center items-center rounded-lg bg-white dark:bg-slate-900 border border-slate-200/30 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 select-none cursor-pointer"
              title="Bon Précédent"
            >
              <span className="text-xs font-sans leading-none text-slate-800 dark:text-sky-400 font-extrabold">◀</span>
              <span className="text-[7.5px] font-black text-slate-500 uppercase tracking-tight mt-0.5">Préc.</span>
            </button>
            <button
              onClick={handleNext}
              disabled={mode === 'create' || activeVoucherIndex >= purchases.length - 1}
              className="w-10 h-9 flex flex-col justify-center items-center rounded-lg bg-white dark:bg-slate-900 border border-slate-200/30 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 select-none cursor-pointer"
              title="Bon Suivant"
            >
              <span className="text-xs font-sans leading-none text-slate-800 dark:text-sky-400 font-extrabold">▶</span>
              <span className="text-[7.5px] font-black text-slate-500 uppercase tracking-tight mt-0.5">Suiv.</span>
            </button>
            <button
              onClick={handleLast}
              disabled={mode === 'create' || purchases.length === 0}
              className="w-10 h-9 flex flex-col justify-center items-center rounded-lg bg-white dark:bg-slate-900 border border-slate-200/30 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 select-none cursor-pointer"
              title="Dernier Bon"
            >
              <span className="text-sm font-sans leading-none text-slate-800 dark:text-sky-400 font-extrabold">⏭</span>
              <span className="text-[7.5px] font-black text-slate-500 uppercase tracking-tight mt-0.5">Fin</span>
            </button>
          </div>

          <div className="h-7 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1" />

          {/* Action Buttons styled like SalesVoucherWindow */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={handleNewVoucher}
              disabled={mode === 'create'}
              className="px-3.5 h-10 flex items-center justify-center gap-2 bg-gradient-to-br from-emerald-500 to-teal-600 hover:to-teal-700 text-white rounded-xl shadow-md cursor-pointer transition-transform duration-100 active:scale-95 disabled:opacity-40"
            >
              <span className="text-base">📄</span>
              <div className="flex flex-col text-left font-sans">
                <span className="font-extrabold text-[10px] uppercase tracking-wider leading-none">Nouveau bon</span>
                <span className="text-[8px] font-bold text-emerald-100 tracking-wider mt-0.5">[ F1 ]</span>
              </div>
            </button>

            {mode === 'create' ? (
              <button
                onClick={handleSaveVoucher}
                className="px-3.5 h-10 flex items-center justify-center gap-2 bg-gradient-to-br from-emerald-600 to-teal-700 hover:to-teal-800 text-white rounded-xl shadow-md cursor-pointer transition-transform duration-100 active:scale-95"
              >
                <span className="text-base">🔒</span>
                <div className="flex flex-col text-left font-sans">
                  <span className="font-extrabold text-[10px] uppercase tracking-wider leading-none">Fermer le bon</span>
                  <span className="text-[8px] font-extrabold text-emerald-150 tracking-wider mt-0.5">[ F5 ]</span>
                </div>
              </button>
            ) : (
              <button
                onClick={() => alert(`Impression lancée pour Bon d'Achat N° ${selectedVoucher?.id || ''}`)}
                disabled={!selectedVoucher}
                className="px-3.5 h-10 flex items-center justify-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-950 shadow-xs cursor-pointer transition-transform duration-100 active:scale-95 disabled:opacity-40"
              >
                <span className="text-base">🖨️</span>
                <div className="flex flex-col text-left font-sans">
                  <span className="font-extrabold text-[10px] uppercase tracking-wider leading-none">Impression</span>
                  <span className="text-[8px] font-bold text-slate-400 tracking-wider mt-0.5">[ F3 ]</span>
                </div>
              </button>
            )}

            <button
              onClick={handleEditVoucher}
              disabled={mode === 'create' || !selectedVoucher}
              className="px-3.5 h-10 flex items-center justify-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-950 shadow-xs cursor-pointer disabled:opacity-40 transition-transform duration-100 active:scale-95"
            >
              <span className="text-base">✏️</span>
              <div className="flex flex-col text-left font-sans">
                <span className="font-extrabold text-[10px] uppercase tracking-wider leading-none">Modifier</span>
                <span className="text-[8px] font-bold text-slate-400 tracking-wider mt-0.5">[ F4 ]</span>
              </div>
            </button>

            <button
              onClick={() => {
                if (mode !== 'create') {
                  alert("Vous devez être en mode création ou modification de bon d'achat.");
                  return;
                }
                const date = prompt("Saisir la date du bon (JJ/MM/AAAA) :", newDate);
                if (date) setNewDate(date);
              }}
              disabled={mode !== 'create'}
              className="px-3.5 h-10 flex items-center justify-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-950 shadow-xs cursor-pointer disabled:opacity-40 transition-transform duration-100 active:scale-95"
            >
              <span className="text-base">✒️</span>
              <div className="flex flex-col text-left font-sans">
                <span className="font-extrabold text-[10px] uppercase tracking-wider leading-none">Infos Bon</span>
                <span className="text-[8px] font-bold text-slate-400 tracking-wider mt-0.5">[ CTRL+F ]</span>
              </div>
            </button>

            {mode === 'create' ? (
              <button
                onClick={() => setMode('view')}
                className="px-3.5 h-10 flex items-center justify-center gap-2 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-950 cursor-pointer transition-transform duration-100 active:scale-95"
              >
                <span className="text-base">✕</span>
                <div className="flex flex-col text-left font-sans">
                  <span className="font-extrabold text-[10px] uppercase tracking-wider leading-none">Annuler</span>
                  <span className="text-[8px] font-bold text-rose-500 tracking-wider mt-0.5">[ F2 ]</span>
                </div>
              </button>
            ) : (
              <button
                onClick={handleDeleteVoucher}
                disabled={!selectedVoucher}
                className="px-3.5 h-10 flex items-center justify-center gap-2 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-950 cursor-pointer disabled:opacity-40 transition-transform duration-100 active:scale-95"
              >
                <span className="text-base">🗑️</span>
                <div className="flex flex-col text-left font-sans">
                  <span className="font-extrabold text-[10px] uppercase tracking-wider leading-none">Supprimer</span>
                  <span className="text-[8px] font-semibold text-rose-500 tracking-wider mt-0.5">[ CTRL+SUPP ]</span>
                </div>
              </button>
            )}
          </div>
        </div>

        <button
          onClick={() => {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(purchases, null, 2));
            const dlAnchorElem = document.createElement('a');
            dlAnchorElem.setAttribute("href", dataStr);
            dlAnchorElem.setAttribute("download", `composes_achats_${Date.now()}.json`);
            dlAnchorElem.click();
          }}
          className="px-3.5 h-10 mr-1 flex items-center justify-center gap-2 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-205 dark:border-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-950 shadow-xs cursor-pointer transition-transform duration-100 active:scale-95 text-xs font-bold"
        >
          <span>📥 Importer des bons (JSON)</span>
        </button>
      </div>

      {/* Middle Pane: Master historical list & Header Fields */}
      <div 
        id="top-row-container" 
        className="flex flex-col lg:flex-row gap-2 select-none shrink-0" 
        style={{ height: `${topSectionHeight}px` }}
      >
        {/* Vouchers Master Table (Left/Center) */}
        <div 
          style={{ width: `${topSplitWidth}%` }} 
          className="flex flex-col rounded-2xl border border-slate-200/50 dark:border-slate-800/85 bg-white dark:bg-slate-950 h-full min-w-[200px] overflow-hidden shadow-xs"
        >
          <div className="bg-slate-50 dark:bg-slate-900 font-bold px-4 py-2.5 border-b border-slate-150 dark:border-slate-850/60 text-slate-700 dark:text-slate-300 font-sans select-none flex justify-between items-center shrink-0">
            <span className="flex items-center gap-1.5 font-display text-xs font-extrabold">
              <span className="text-indigo-500">📋</span> Registre des Bons d'Achat
            </span>
            <span className="text-slate-400 text-[9.5px] uppercase font-mono tracking-wider">Algérie Commerce</span>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left font-sans text-xs border-collapse">
              <thead className="bg-slate-100/60 dark:bg-slate-900 font-semibold text-slate-500 dark:text-slate-400 sticky top-0 select-none border-b border-slate-200/40 dark:border-slate-800/40 z-10 text-[10.5px] uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-2">N°</th>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Heure</th>
                  <th className="px-3 py-2">Fournisseur</th>
                  <th className="px-3 py-2 text-center">Nbre P</th>
                  <th className="px-3 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="font-sans text-[11.5px]">
                {purchases.map((v) => {
                  const isCur = v.id === selectedVoucherId && mode === 'view';
                  return (
                    <tr
                      key={v.id}
                      onClick={() => {
                        if (mode === 'create') return;
                        setSelectedVoucherId(v.id);
                      }}
                      className={`cursor-pointer border-b border-slate-100 dark:border-slate-900/60 transition-colors ${
                        isCur 
                          ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold' 
                          : 'hover:bg-slate-100/60 dark:hover:bg-slate-900/40 odd:bg-slate-50/20 dark:odd:bg-slate-900/10 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <td className="px-3 py-2 font-semibold">{v.id}</td>
                      <td className="px-3 py-2 text-slate-500 dark:text-slate-400">{v.date}</td>
                      <td className="px-3 py-2 text-slate-500 dark:text-slate-400">{v.time}</td>
                      <td className="px-3 py-2 truncate max-w-[140px] select-all font-medium">{v.supplier}</td>
                      <td className="px-3 py-2 text-center text-slate-500 dark:text-slate-400">{v.itemsCount}</td>
                      <td className="px-3 py-2 text-right font-black text-indigo-950 dark:text-indigo-300">
                        {v.ttc.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DA
                      </td>
                    </tr>
                  );
                })}
                {mode === 'create' && (
                  <tr className="bg-yellow-500/5 border-double border-b border-yellow-300/40 animate-pulse text-yellow-600 dark:text-yellow-400 font-bold">
                    <td className="px-3 py-2">{newVoucherId}</td>
                    <td className="px-3 py-2">{newDate}</td>
                    <td className="px-3 py-2">{newTime}</td>
                    <td className="px-3 py-2 truncate max-w-[140px] italic">{newSupplierName} (Mode d'Achat)</td>
                    <td className="px-3 py-2 text-center">{draftItems.length}</td>
                    <td className="px-3 py-2 text-right font-black">
                      {draftMetrics.ttc.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DA
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* DRAG SPLITTER (Width) */}
        <div 
          onPointerDown={(e) => {
            e.preventDefault();
            try {
              e.currentTarget.setPointerCapture(e.pointerId);
            } catch (err) {}
            resizeStartRef.current = {
              x: e.clientX,
              y: e.clientY,
              topHeight: topSectionHeight,
              bottomHeight: bottomSectionHeight,
              topWidth: topSplitWidth,
              bottomWidth: bottomSplitWidth
            };
            setIsResizingTopWidth(true);
          }}
          className="hidden lg:flex w-1.5 bg-transparent hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-col-resize h-full select-none items-center justify-center border-l border-r border-transparent shrink-0"
          title="Glisser pour ajuster la largeur"
        >
          <div className="w-[2px] h-6 bg-slate-300 dark:bg-slate-700 rounded" />
        </div>

        {/* Compact Form Panel (Right) */}
        <div 
          style={{ width: `${100 - topSplitWidth}%` }} 
          className="bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/85 flex flex-col gap-3 select-all overflow-y-auto h-full min-w-[220px] shadow-xs"
        >
          <div className="flex flex-col gap-1">
            <span className="font-extrabold text-[10px] uppercase text-slate-500 tracking-wider">N° Bon d'Achat</span>
            <input
              type="text"
              readOnly
              value={mode === 'create' ? newVoucherId : (selectedVoucher?.id || '')}
              className="h-8.5 rounded-xl bg-slate-100/50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 px-3 outline-none text-xs font-mono font-bold text-slate-700 dark:text-slate-300"
            />
          </div>

          <div className="flex flex-col gap-1">
            <span className="font-extrabold text-[10px] uppercase text-slate-500 tracking-wider">Date d'opération</span>
            <input
              type="text"
              readOnly={mode === 'view'}
              value={mode === 'create' ? newDate : (selectedVoucher?.date || '')}
              onChange={(e) => mode === 'create' && setNewDate(e.target.value)}
              className="h-8.5 rounded-xl bg-white dark:bg-slate-905 border border-slate-205 dark:border-slate-800 focus:border-slate-300 dark:focus:border-slate-700 outline-none px-3 font-mono text-xs text-slate-705 dark:text-slate-300"
            />
          </div>

          <div className="flex flex-col gap-1.5 bg-indigo-50/20 dark:bg-indigo-950/10 p-2.5 rounded-xl border border-indigo-150/10">
            <span className="font-extrabold text-[10px] uppercase text-indigo-505 dark:text-indigo-400 tracking-wider">Fournisseur / Tiers</span>
            {mode === 'create' ? (
              <select
                value={newSupplierName}
                onChange={(e) => setNewSupplierName(e.target.value)}
                className="h-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2 text-xs font-bold text-indigo-950 dark:text-indigo-300 outline-none focus:border-indigo-300 cursor-pointer"
              >
                {suppliers.map(s => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                readOnly
                value={selectedVoucher?.supplier || ''}
                className="h-8.5 rounded-xl bg-slate-100/50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 px-3 outline-none text-xs font-bold text-indigo-950 dark:text-indigo-300 truncate"
              />
            )}
          </div>

          <hr className="border-slate-100 dark:border-slate-900 my-1 shrink-0" />

          <div className="flex flex-col gap-1">
            <span className="font-extrabold text-[10px] uppercase text-slate-500 tracking-wider">Ancien solde</span>
            <input
              type="text"
              readOnly
              value={displayMetrics.oldBalance.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' DA'}
              className="h-8.5 rounded-xl bg-slate-100/50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 px-3 text-right outline-none text-xs font-mono font-bold text-rose-600 dark:text-rose-400"
            />
          </div>

          <div className="flex flex-col gap-1">
            <span className="font-extrabold text-[10px] uppercase text-slate-500 tracking-wider">Montant total</span>
            <input
              type="text"
              readOnly
              value={displayMetrics.ttc.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' DA'}
              className="h-8.5 rounded-xl bg-slate-100/50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 px-3 text-right outline-none text-xs font-mono font-bold text-indigo-950 dark:text-indigo-300"
            />
          </div>

          <div className="flex flex-col gap-1">
            <span className="font-extrabold text-[10px] uppercase text-slate-500 tracking-wider">Versement d'achat</span>
            <input
              type="number"
              disabled={mode === 'view'}
              value={mode === 'create' ? versement : (selectedVoucher?.versement || 0)}
              onChange={(e) => setVersement(Number(e.target.value))}
              placeholder="0,00"
              className="h-8.5 rounded-xl bg-white dark:bg-slate-905 border border-slate-205 dark:border-slate-800 focus:border-slate-300 dark:focus:border-slate-700 outline-none px-3 text-right text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 disabled:bg-slate-100/50 dark:disabled:bg-slate-900 disabled:text-slate-400"
            />
          </div>

          <div className="flex flex-col gap-1">
            <span className="font-extrabold text-[10px] uppercase text-slate-500 tracking-wider">Nouveau solde</span>
            <input
              type="text"
              readOnly
              value={displayMetrics.newBalance.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' DA'}
              className="h-8.5 rounded-xl bg-slate-100/50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 px-3 text-right outline-none text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400"
            />
          </div>
        </div>
      </div>

      {/* DRAG SPLITTER (Top Height) - drag to resize the division height */}
      <div 
        onPointerDown={(e) => {
          e.preventDefault();
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch (err) {}
          resizeStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            topHeight: topSectionHeight,
            bottomHeight: bottomSectionHeight,
            topWidth: topSplitWidth,
            bottomWidth: bottomSplitWidth
          };
          setIsResizingTopHeight(true);
        }}
        className="h-1.5 bg-transparent hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-row-resize border-t border-b border-transparent rounded flex items-center justify-center select-none shrink-0"
        title="Glisser verticalement pour changer la hauteur du registre"
      >
        <div className="w-12 h-1 bg-slate-300 dark:bg-slate-700 rounded-full" />
      </div>

      {/* BOTTOM ACTION BUTTONS - MODERNIZED AND COHESIVE */}
      <div className="flex flex-wrap items-center justify-between bg-white dark:bg-slate-900 p-2 border border-slate-200/50 dark:border-slate-800/85 rounded-2xl gap-2 shrink-0 select-none shadow-xs">
        
        <div className="flex items-center gap-2 flex-wrap">
          {/* Bottom Table Pager Navigator */}
          <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200/20 gap-1 shadow-inner shrink-0">
            <button
              type="button"
              onClick={() => setSelectedDraftIdx(draftItems.length > 0 ? 0 : -1)}
              disabled={mode === 'view' || draftItems.length === 0}
              title="Aller au début de la liste"
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-white dark:bg-slate-900 border border-slate-200/20 text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 select-none cursor-pointer"
            >
              ⏮
            </button>
            <button
              type="button"
              onClick={() => setSelectedDraftIdx(prev => Math.max(0, prev - 1))}
              disabled={mode === 'view' || selectedDraftIdx <= 0}
              title="Article Précédent"
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-white dark:bg-slate-900 border border-slate-200/20 text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 select-none cursor-pointer"
            >
              ◀
            </button>
            <button
              type="button"
              onClick={() => setSelectedDraftIdx(prev => Math.min(draftItems.length - 1, prev + 1))}
              disabled={mode === 'view' || selectedDraftIdx === -1 || selectedDraftIdx >= draftItems.length - 1}
              title="Article Suivant"
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-white dark:bg-slate-900 border border-slate-200/20 text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 select-none cursor-pointer"
            >
              ▶
            </button>
            <button
              type="button"
              onClick={() => setSelectedDraftIdx(draftItems.length > 0 ? draftItems.length - 1 : -1)}
              disabled={mode === 'view' || draftItems.length === 0}
              title="Aller à la fin de la liste"
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-white dark:bg-slate-900 border border-slate-200/20 text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 select-none cursor-pointer"
            >
              ⏭
            </button>
          </div>

          {/* Search Box right beside the Pager buttons */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 p-1 px-2.5 rounded-xl border border-slate-200 dark:border-slate-850 shrink-0">
            <span className="text-[12px]" title="Recherche dans ce bon d'achat">🔍</span>
            <input
              type="text"
              placeholder="Filtrer ce bon..."
              value={localSearchQuery}
              onChange={(e) => setLocalSearchQuery(e.target.value)}
              className="w-48 h-6 font-sans text-xs bg-transparent text-slate-700 dark:text-slate-200 focus:outline-none placeholder:text-slate-400 dark:placeholder:text-slate-600 font-bold"
            />
            {localSearchQuery && (
              <button
                type="button"
                onClick={() => setLocalSearchQuery('')}
                className="text-[10px] text-slate-400 hover:text-slate-700 dark:hover:text-white font-extrabold px-1 cursor-pointer"
                title="Effacer le filtre"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Action buttons list */}
        <div className="flex gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => handleOpenProductDialog('add_new')}
            disabled={mode === 'view'}
            className="px-3.5 h-9 rounded-xl font-bold bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-xs cursor-pointer disabled:opacity-30 flex items-center gap-1.5 active:scale-95 transition-all text-[11px]"
          >
            <span>➕ Nouveau</span>
            <span className="text-[8px] opacity-80 font-mono">[Ctrl+N]</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenProductDialog('insert_existing')}
            disabled={mode === 'view'}
            className="px-3.5 h-9 rounded-xl font-bold bg-gradient-to-br from-teal-500 to-teal-600 text-white shadow-xs cursor-pointer disabled:opacity-30 flex items-center gap-1.5 active:scale-95 transition-all text-[11px]"
          >
            <span>📥 Insérer</span>
            <span className="text-[8px] opacity-80 font-mono">[Entrer]</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenProductDialog('edit_existing')}
            disabled={mode === 'view' || selectedDraftIdx === -1}
            className="px-3.5 h-9 rounded-xl font-bold bg-white dark:bg-slate-900 text-slate-755 dark:text-slate-300 border border-slate-200 dark:border-slate-800 shadow-xs cursor-pointer disabled:opacity-30 flex items-center gap-1.5 active:scale-95 transition-all text-[11px]"
          >
            <span>✏️ Modifier</span>
            <span className="text-[8px] opacity-80 font-mono">[F8]</span>
          </button>

          <button
            type="button"
            onClick={() => handleRemoveDraftItem(selectedDraftIdx)}
            disabled={mode === 'view' || selectedDraftIdx === -1}
            className="px-3.5 h-9 rounded-xl font-bold bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 border border-rose-250 dark:border-rose-900/45 shadow-xs cursor-pointer disabled:opacity-30 flex items-center gap-1.5 active:scale-95 transition-all text-[11px]"
          >
            <span>❌ Supprimer</span>
            <span className="text-[8px] opacity-80 font-mono">[Suppr]</span>
          </button>

          <button
            type="button"
            onClick={() => alert("Impression du code-barre d'articles lancé sur étiquettes thermique.")}
            className="px-3.5 h-9 rounded-xl font-bold bg-white dark:bg-slate-900 text-slate-755 dark:text-slate-350 border border-slate-200 dark:border-slate-800 shadow-xs cursor-pointer flex items-center gap-1.5 active:scale-95 transition-all text-[11px]"
          >
            <span>🖨️ Étiquettes</span>
            <span className="text-[8px] opacity-80 font-mono">[F10]</span>
          </button>
          
          <button
            type="button"
            onClick={() => handleOpenProductDialog('insert_existing')}
            title="Recherche générale catalogue"
            className="px-3 h-9 bg-slate-100 dark:bg-slate-950/40 text-slate-700 dark:text-slate-300 border border-slate-200/40 dark:border-slate-850/40 font-bold rounded-xl text-[11px] flex items-center gap-1.5 hover:bg-slate-200 cursor-pointer"
          >
            <span>🌐 Stock</span>
          </button>
        </div>
      </div>

      {/* Item details table and sidebar totals */}
      <div 
        id="bottom-row-container" 
        className="flex-1 flex flex-col lg:flex-row gap-2 select-none min-h-[160px]"
      >
        {/* Table of items details */}
        <div 
          style={{ width: `${bottomSplitWidth}%` }} 
          className="flex flex-col rounded-2xl border border-slate-200/50 dark:border-slate-800/85 bg-white dark:bg-slate-950 h-full min-w-[250px] overflow-hidden shadow-xs"
        >
          <div className="bg-slate-50 dark:bg-slate-900 font-bold px-4 py-2.5 border-b border-slate-150 dark:border-slate-850/60 text-slate-700 dark:text-slate-300 font-sans select-none flex justify-between items-center shrink-0">
            <span className="font-display font-extrabold text-xs flex items-center gap-1.5">
              <span className="text-emerald-500">🛒</span> Articles de ce Bon d'Achat
            </span>
            <span className="text-slate-400 font-mono text-[9px] uppercase tracking-wide">F8 pour éditer la ligne</span>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left font-sans text-xs border-collapse">
              <thead className="bg-slate-100/60 dark:bg-slate-900 font-semibold text-slate-500 dark:text-slate-400 sticky top-0 select-none border-b border-slate-200/40 dark:border-slate-800/40 z-10 text-[10.5px] uppercase tracking-wider">
                <tr>
                  <th className="w-10 px-3 py-2 text-center">N°</th>
                  <th className="w-28 px-3 py-2 font-mono">Code produit</th>
                  <th className="px-3 py-2">Désignation Produit</th>
                  <th className="w-16 px-1 py-2 text-center">Colis</th>
                  <th className="w-16 px-1 py-2 text-center">Colisage</th>
                  <th className="w-16 px-1 py-2 text-center">Qté</th>
                  <th className="w-24 px-3 py-2 text-right">Prix Unit</th>
                  <th className="w-24 px-3 py-2 text-right">Montant HT</th>
                </tr>
              </thead>
              <tbody className="font-sans text-[11.5px] text-slate-705 dark:text-slate-300">
                {currentItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-16 text-slate-400 dark:text-slate-500 italic font-sans">
                      Aucun produit n'est encore enregistré dans ce bon d'achat. <br/>
                      <span className="text-[10px] text-indigo-500/80 font-bold not-italic font-sans block mt-1">Cliquez sur (+ Nouveau) ou (+ Insérer) pour commencer</span>
                    </td>
                  </tr>
                ) : (
                  currentItems.map((item, index) => {
                    const actualIndex = unfilteredItems.findIndex(d => d.id === item.id);
                    const isSelected = actualIndex === selectedDraftIdx && mode === 'create';
                    return (
                      <tr 
                        key={item.id} 
                        onClick={() => {
                          if (mode === 'create') setSelectedDraftIdx(actualIndex);
                        }}
                        className={`border-b border-slate-100 dark:border-slate-900/60 transition-colors cursor-pointer ${
                          isSelected 
                            ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold' 
                            : 'hover:bg-slate-100/60 dark:hover:bg-slate-900/40 even:bg-slate-50/20 dark:even:bg-slate-900/10'
                        }`}
                      >
                        <td className="px-3 py-2 text-center font-bold text-slate-400">{actualIndex + 1}</td>
                        <td className="px-3 py-2 font-mono font-bold text-slate-900 dark:text-white">{item.code}</td>
                        <td className="px-3 py-2 font-sans truncate select-all">{item.designation}</td>
                        <td className="px-1 py-2 text-center font-mono">{item.nbreColis ?? 0}</td>
                        <td className="px-1 py-2 text-center text-slate-400 dark:text-slate-500 font-mono">{item.colisage ?? 12}</td>
                        <td className={`px-1 py-2 text-center font-mono font-bold ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-indigo-950 dark:text-indigo-300'}`}>{item.qty}</td>
                        <td className="px-3 py-2 text-right font-mono font-bold">
                          {item.price.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className={`px-3 py-2 text-right font-mono font-black ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-900 dark:text-slate-100'}`}>
                          {item.total.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="bg-slate-50 dark:bg-slate-900 px-4 py-3 flex justify-between items-center border-t border-slate-200/40 dark:border-slate-800/40 font-sans select-none shrink-0">
            <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wider">Total des d'articles</span>
            <span className="font-mono font-black text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 dark:bg-indigo-950/40 px-3 py-1 rounded-xl">
              {displayMetrics.totalQty} Articles
            </span>
          </div>
        </div>

        {/* DRAG SPLITTER (Width) */}
        <div 
          onPointerDown={(e) => {
            e.preventDefault();
            try {
              e.currentTarget.setPointerCapture(e.pointerId);
            } catch (err) {}
            resizeStartRef.current = {
              x: e.clientX,
              y: e.clientY,
              topHeight: topSectionHeight,
              bottomHeight: bottomSectionHeight,
              topWidth: topSplitWidth,
              bottomWidth: bottomSplitWidth
            };
            setIsResizingBottomWidth(true);
          }}
          className="hidden lg:flex w-1.5 bg-transparent hover:bg-slate-205 dark:hover:bg-slate-800 transition-colors cursor-col-resize h-full select-none items-center justify-center border-l border-r border-transparent shrink-0"
          title="Faites glisser pour ajuster la largeur des totaux"
        >
          <div className="w-[2px] h-6 bg-slate-300 dark:bg-slate-700 rounded" />
        </div>

        {/* Sidebar Totals column (Right) */}
        <div 
          style={{ width: `${100 - bottomSplitWidth}%` }} 
          className="bg-white dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800/80 p-4 rounded-2xl flex flex-col gap-3 select-all overflow-y-auto h-full min-w-[200px] shadow-xs"
        >
          <div className="bg-indigo-500/10 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 font-extrabold px-3 py-1.5 rounded-xl text-[9.5px] tracking-wider text-center uppercase font-sans shrink-0">
            Recap Financier Achat
          </div>
          
          <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-900 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[9px]">S/Total Brut</span>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
              {displayMetrics.rawAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DA
            </span>
          </div>

          <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-900 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[9px]">Remise Fournisseur</span>
            <span className="font-mono font-bold text-rose-600 dark:text-rose-400">0,00 DA</span>
          </div>

          <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-900 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[9px]">Total HT</span>
            <span className="font-mono font-extrabold text-slate-800 dark:text-slate-100">
              {displayMetrics.totalHT.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DA
            </span>
          </div>

          <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-900 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[9px]">TVA (%)</span>
            <span className="font-mono text-slate-805 dark:text-slate-350">0,00 DA (0%)</span>
          </div>

          <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-900 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[9px]">Timbre Fiscal</span>
            <span className="font-mono text-slate-805 dark:text-slate-350">
              {displayMetrics.timbre.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DA
            </span>
          </div>

          {/* NET EN DINARS (TTC À PAYER) replaces previous styling to match sales */}
          <div className="bg-slate-950 dark:bg-black p-3 rounded-xl text-center flex flex-col gap-0.5 shadow-md border border-slate-850/50 mt-auto shrink-0">
            <span className="text-[8.5px] font-black text-amber-500 tracking-wider font-sans uppercase">NET EN DINARS (ACHAT)</span>
            <span className="text-lg font-mono font-black text-emerald-400 drop-shadow-[0_0_4px_rgba(52,211,153,0.3)]">
              {displayMetrics.ttc.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DA
            </span>
          </div>
        </div>
      </div>

      {/* ==================== SELECT CATALOG PRODUCT MODAL ==================== */}
      {isCatalogSearchOpen && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-50 p-2 backdrop-blur-[1px]">
          <div className="w-[540px] bg-[#d4d0c8] border-2 border-t-white border-l-white border-b-[#404040] border-r-[#404040] shadow-2xl flex flex-col p-[2px] font-mono text-xs text-black">
            
            {/* Modal Titlebar */}
            <div className="bg-[#000080] text-white font-sans font-bold px-1.5 py-1 flex justify-between items-center select-none">
              <span className="flex items-center gap-1">📥 INSÉRER UN PRODUIT DEPUIS LE CATALOGUE</span>
              <button 
                onClick={() => setIsCatalogSearchOpen(false)}
                className="w-4 h-4 bg-[#d4d0c8] text-black font-extrabold flex items-center justify-center border border-white hover:bg-red-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Instruction Banner */}
            <div className="bg-amber-50 text-amber-950 px-2.5 py-1.5 border-b border-gray-400 font-sans select-none leading-normal">
              Recherchez et sélectionnez le produit dans votre stock. Cliquez sur un article pour le choisir puis validez pour configurer sa quantité d'achat.
            </div>

            {/* Body */}
            <div className="p-2.5 flex flex-col gap-2 bg-[#d4d0c8] flex-1">
              {/* Search Box Row */}
              <div className="grid grid-cols-12 gap-1.5 items-center bg-blue-50/50 border border-blue-200 p-2 rounded">
                <label className="col-span-3 font-bold text-blue-900 text-[11px] font-sans">RECHERCHER :</label>
                <input
                  type="text"
                  autoFocus
                  placeholder="Tapez pour filtrer par code-barre, nom, famille..."
                  value={insertSearchQuery}
                  onChange={(e) => {
                    setInsertSearchQuery(e.target.value);
                    // Reset selected standard search product on query change so it chooses the first match automatically
                    setSelectedSearchProduct(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      // Find first match or currently selected
                      const queryText = insertSearchQuery.toLowerCase().trim();
                      const matched = localProducts.filter(p => {
                        if (!queryText) return true;
                        return p.code.toLowerCase().includes(queryText) ||
                               p.designation.toLowerCase().includes(queryText) ||
                               (p.category || '').toLowerCase().includes(queryText);
                      });
                      const bestItem = selectedSearchProduct && matched.some(p => p.code === selectedSearchProduct.code)
                        ? selectedSearchProduct
                        : matched[0];
                      if (bestItem) {
                        handleSelectCatalogProduct(bestItem);
                      }
                    }
                  }}
                  className="col-span-9 h-7 px-2 bg-white border border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-xs outline-none font-bold text-blue-955 placeholder:text-gray-400 placeholder:font-normal"
                />
              </div>

              {/* Matching products table */}
              <div className="flex flex-col border border-white border-b-[#808080] border-r-[#808080]">
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-1 bg-[#cecac3] font-bold text-[10px] text-slate-800 border-b border-gray-400 py-1 px-1.5 select-none font-sans">
                  <span className="col-span-3 border-r border-gray-300">Code Article</span>
                  <span className="col-span-4 border-r border-gray-300">Désignation Produit</span>
                  <span className="col-span-2.5 border-r border-gray-300">Famille</span>
                  <span className="col-span-1.5 border-r border-gray-300 text-center">Stock</span>
                  <span className="col-span-1 border-r border-gray-300 text-right font-sans">PV1</span>
                </div>
                
                {/* Table Body */}
                <div className="max-h-[220px] overflow-y-auto bg-white border-t border-[#808080] border-l-[#808080] flex flex-col font-mono text-[11px] font-bold text-slate-800 divide-y divide-gray-100">
                  {(() => {
                    const queryText = insertSearchQuery.toLowerCase().trim();
                    const matched = localProducts.filter(p => {
                      if (!queryText) return true;
                      return p.code.toLowerCase().includes(queryText) ||
                             p.designation.toLowerCase().includes(queryText) ||
                             (p.category || '').toLowerCase().includes(queryText);
                    });

                    const activeItem = selectedSearchProduct && matched.some(p => p.code === selectedSearchProduct.code)
                      ? selectedSearchProduct
                      : (matched[0] || null);

                    return (
                      <>
                        {matched.map((p) => {
                          const isActive = activeItem && activeItem.code === p.code;
                          return (
                            <div 
                              key={p.code}
                              onClick={() => setSelectedSearchProduct(p)}
                              onDoubleClick={() => handleSelectCatalogProduct(p)}
                              className={`grid grid-cols-12 gap-1 py-1 px-1.5 cursor-pointer leading-tight select-none ${
                                isActive 
                                  ? 'bg-[#000080] text-white hover:bg-[#000080]' 
                                  : 'hover:bg-blue-50 text-slate-800'
                              }`}
                            >
                              <span className="col-span-3 truncate">{p.code}</span>
                              <span className="col-span-4 truncate">{p.designation}</span>
                              <span className="col-span-2.5 truncate font-sans text-[10px] text-gray-500 group-hover:text-inherit">
                                {p.category || '(Sans)'}
                              </span>
                              <span className={`col-span-1.5 text-center truncate ${isActive ? 'text-white' : 'text-[#000080]'}`}>
                                {p.stock}
                              </span>
                              <span className="col-span-1 text-right truncate">
                                {Math.round(p.prixVente1)}
                              </span>
                            </div>
                          );
                        })}
                        {matched.length === 0 && (
                          <div className="p-8 text-center text-gray-400 italic font-sans">
                            Aucun produit correspondant trouvé dans votre stock.
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Bottom selection footer */}
              {(() => {
                const queryText = insertSearchQuery.toLowerCase().trim();
                const matched = localProducts.filter(p => {
                  if (!queryText) return true;
                  return p.code.toLowerCase().includes(queryText) ||
                         p.designation.toLowerCase().includes(queryText) ||
                         (p.category || '').toLowerCase().includes(queryText);
                });
                const activeItem = selectedSearchProduct && matched.some(p => p.code === selectedSearchProduct.code)
                  ? selectedSearchProduct
                  : (matched[0] || null);

                return (
                  <>
                    {activeItem && (
                      <div className="bg-[#000080]/15 text-[#000080] p-1.5 px-2 border border-[#000080]/20 rounded font-sans flex justify-between items-center select-none text-[11px] font-bold">
                        <span>
                          Produit sélectionné : <span className="text-blue-900">{activeItem.designation}</span> ({activeItem.code})
                        </span>
                        <span>
                          Stock actuel : <span className="text-blue-900">{activeItem.stock}</span> unités
                        </span>
                      </div>
                    )}

                    {/* Dialog Buttons */}
                    <div className="flex justify-end gap-2 mt-1 select-none font-sans font-bold">
                      <button
                        type="button"
                        onClick={() => setIsCatalogSearchOpen(false)}
                        className="px-4 h-7 text-xs bg-[#d4d0c8] text-black border border-t-white border-l-white border-b-[#404040] border-r-[#404040] active:border-b-white active:border-r-white active:border-t-[#404040] active:border-l-[#404040] hover:bg-gray-250 cursor-default"
                      >
                        Annuler (Echap)
                      </button>
                      <button
                        type="button"
                        disabled={!activeItem}
                        onClick={() => {
                          if (activeItem) handleSelectCatalogProduct(activeItem);
                        }}
                        className="px-5 h-7 text-xs bg-[#000080] text-white border border-t-blue-400 border-l-blue-400 border-b-black border-r-black hover:bg-blue-800 disabled:opacity-50 cursor-default"
                      >
                        Valider l'insertion (Entrer)
                      </button>
                    </div>
                  </>
                );
              })()}

            </div>

          </div>
        </div>
      )}

      {/* ==================== PRODUIT (PRODUCT) MODAL DIALOG ==================== */}
      {isProductDialogOpen && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-50 p-2 backdrop-blur-[1px]">
          <div className="w-[530px] bg-[#d4d0c8] border-2 border-t-white border-l-white border-b-[#404040] border-r-[#404040] shadow-2xl flex flex-col p-[2px] font-mono text-xs text-black">
            
            {/* Modal Titlebar */}
            <div className="bg-[#000080] text-white font-sans font-bold px-1.5 py-1 flex justify-between items-center select-none">
              <span className="flex items-center gap-1">📦 PRODUIT</span>
              <button 
                onClick={() => setIsProductDialogOpen(false)}
                className="w-4 h-4 bg-[#d4d0c8] text-black font-extrabold flex items-center justify-center border border-white hover:bg-red-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Sub-banner: last purchased price or info */}
            <div className="bg-sky-100 text-sky-950 px-2 py-1.5 font-bold border-b border-gray-400 select-none">
              Dernier prix acheté pour ce fournisseur: {prodStockEnStock > 0 ? `${prodPrixDeRevient} DA` : '???'}
            </div>

            {/* Interactive F1/F2/F3 tabs header bar */}
            <div className="flex bg-[#d4d0c8] border-b border-gray-400 pt-1 px-1 gap-1">
              <button
                type="button"
                onClick={() => setActiveDialogTab('general')}
                className={`px-3 py-1 text-center font-bold border-t border-l border-r rounded-t select-none ${
                  activeDialogTab === 'general'
                    ? 'bg-[#d4d0c8] border-white border-b-transparent text-slate-900 z-10 -mb-[1px]'
                    : 'bg-[#b6b2aa] border-t-gray-100 border-l-gray-100 border-r-gray-400 text-gray-700 hover:bg-gray-250'
                }`}
              >
                📁 Général [ F1 ]
              </button>

              <button
                type="button"
                onClick={() => setActiveDialogTab('plus_info')}
                className={`px-3 py-1 text-center font-bold border-t border-l border-r rounded-t select-none ${
                  activeDialogTab === 'plus_info'
                    ? 'bg-[#d4d0c8] border-white border-b-transparent text-slate-900 z-10 -mb-[1px]'
                    : 'bg-[#b6b2aa] border-t-gray-100 border-l-gray-100 border-r-gray-400 text-gray-700 hover:bg-gray-250'
                }`}
              >
                ℹ️ Plus d'info. [ F2 ]
              </button>

              <button
                type="button"
                onClick={() => setActiveDialogTab('photo')}
                className={`px-3 py-1 text-center font-bold border-t border-l border-r rounded-t select-none ${
                  activeDialogTab === 'photo'
                    ? 'bg-[#d4d0c8] border-white border-b-transparent text-slate-900 z-10 -mb-[1px]'
                    : 'bg-[#b6b2aa] border-t-gray-100 border-l-gray-100 border-r-gray-400 text-gray-700 hover:bg-gray-250'
                }`}
              >
                📷 Photo [ F3 ]
              </button>
            </div>

            {/* TAB CONTENTS CONTAINER (With vintage bevel border) */}
            <div className="p-2.5 bg-[#d4d0c8] border border-white border-t-transparent shadow-[inset_-1px_-1px_rgba(0,0,0,0.1),inset_1px_1px_white] flex-1">
              
              {/* TAB 1: GENERAL */}
              {activeDialogTab === 'general' && (
                <div className="flex flex-col gap-2.5">
                  


                  {/* Row: Code with re-generation helper */}
                  <div className="grid grid-cols-12 gap-2 items-center">
                    <label className="col-span-3 font-bold">Code</label>
                    <div className="col-span-9 flex gap-1">
                      <input
                        type="text"
                        value={prodCode}
                        onChange={(e) => setProdCode(e.target.value)}
                        readOnly={dialogMode === 'edit_existing'}
                        placeholder="Ex: 1019939874629"
                        className="flex-1 h-6 px-2 bg-white read-only:bg-gray-200 border border-t-[#808080] border-l-[#808080] border-b-white border-r-white font-mono font-bold outline-none text-red-955 text-sm"
                      />
                      {dialogMode === 'add_new' && (
                        <button
                          type="button"
                          onClick={() => setProdCode(generateRandom13DigitBarcode())}
                          title="Générer un code-barres aléatoire"
                          className="px-2 bg-blue-800 text-white font-bold h-6 border border-white border-b-black border-r-black flex items-center justify-center font-sans hover:bg-blue-700 active:bg-blue-950"
                        >
                          ⚡ Random Code
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Row: Famille */}
                  <div className="grid grid-cols-12 gap-2 items-center">
                    <label className="col-span-3 font-bold">Famille</label>
                    <div className="col-span-9 flex gap-1">
                      {isAddingNewFamille ? (
                        <div className="flex-1 flex gap-1 items-center">
                          <input
                            type="text"
                            value={newFamilleInput}
                            onChange={(e) => setNewFamilleInput(e.target.value)}
                            placeholder="Saisir nouvelle famille..."
                            className="flex-1 h-6 px-1.5 bg-white border border-t-[#808080] border-l-[#808080] border-b-white border-r-white outline-none text-xs font-bold text-blue-900"
                            onKeyDown={(ev) => {
                              if (ev.key === 'Enter') {
                                ev.preventDefault();
                                const trimmed = newFamilleInput.trim().toUpperCase();
                                if (trimmed) {
                                  setCreatedFamilles(prev => {
                                    if (prev.includes(trimmed)) return prev;
                                    return [...prev, trimmed];
                                  });
                                  setProdFamille(trimmed);
                                }
                                setIsAddingNewFamille(false);
                                setNewFamilleInput('');
                              } else if (ev.key === 'Escape') {
                                ev.preventDefault();
                                setIsAddingNewFamille(false);
                                setNewFamilleInput('');
                              }
                            }}
                          />
                          <button
                            type="button"
                            title="Valider"
                            onClick={() => {
                              const trimmed = newFamilleInput.trim().toUpperCase();
                              if (trimmed) {
                                setCreatedFamilles(prev => {
                                  if (prev.includes(trimmed)) return prev;
                                  return [...prev, trimmed];
                                });
                                setProdFamille(trimmed);
                              }
                              setIsAddingNewFamille(false);
                              setNewFamilleInput('');
                            }}
                            className="w-6 h-6 bg-green-100 text-green-900 border border-white border-b-green-800 border-r-green-800 flex items-center justify-center text-xs font-bold outline-none"
                          >
                            ✔
                          </button>
                          <button
                            type="button"
                            title="Annuler"
                            onClick={() => {
                              setIsAddingNewFamille(false);
                              setNewFamilleInput('');
                            }}
                            className="w-6 h-6 bg-red-100 text-red-900 border border-white border-b-red-800 border-r-red-800 flex items-center justify-center text-xs font-bold outline-none"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <>
                          <select
                            value={prodFamille}
                            onChange={(e) => setProdFamille(e.target.value)}
                            className="flex-1 h-6 bg-white border border-t-[#808080] border-l-[#808080] border-b-white border-r-white outline-none text-xs text-slate-800"
                          >
                            {familles.length === 0 ? (
                              <option value="">(Aucune famille)</option>
                            ) : (
                              familles.map(f => (
                                <option key={f} value={f}>{f}</option>
                              ))
                            )}
                          </select>
                          <button 
                            type="button" 
                            title="Ajouter une nouvelle famille"
                            onClick={() => {
                              setIsAddingNewFamille(true);
                              setNewFamilleInput('');
                            }}
                            className="w-6 h-6 bg-gray-200 text-black border border-white border-b-black border-r-black flex items-center justify-center font-bold font-mono outline-none active:border-t-black active:border-l-black active:border-b-white active:border-r-white"
                          >
                            ▶
                          </button>
                          <button 
                            type="button" 
                            title="Gérer les familles (Modifier / Supprimer)"
                            onClick={() => {
                              setIsManagingFamilies(true);
                            }}
                            className="w-6 h-6 bg-gray-200 text-black border border-white border-b-black border-r-black flex items-center justify-center font-bold font-mono outline-none active:border-t-black active:border-l-black active:border-b-white active:border-r-white"
                          >
                            ⚙️
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Row: Designation / Product name */}
                  <div className="grid grid-cols-12 gap-2 items-center">
                    <label className="col-span-3 font-bold">Produit</label>
                    <input
                      type="text"
                      value={prodDesignation}
                      onChange={(e) => setProdDesignation(e.target.value)}
                      placeholder="Indiquez la désignation ou le nom de l'article"
                      className="col-span-9 h-6 px-2 bg-white border border-t-[#808080] border-l-[#808080] border-b-white border-r-white outline-none text-xs"
                    />
                  </div>

                   {/* Row split: Stock, Prix de revient indicator panel */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-200/50 p-2 border border-gray-400 rounded">
                    <div>
                      <span className="block font-bold text-gray-700 text-[10px]">Quantité en stock</span>
                      <input
                        type="number"
                        value={prodStockEnStock}
                        readOnly={true}
                        className="w-full h-6 px-1.5 border border-t-[#808080] border-l-[#808080] border-b-white border-r-white font-mono text-center outline-none text-xs font-bold bg-slate-300 text-slate-700 cursor-not-allowed select-none"
                      />
                    </div>
                    <div>
                      <span className="block font-bold text-gray-700 text-[10px]">Moyenne Prix de revient de base (DA)</span>
                      <input
                        type="number"
                        value={prodPrixDeRevient}
                        readOnly={true}
                        className="w-full h-6 px-1.5 border border-t-[#808080] border-l-[#808080] border-b-white border-r-white font-mono text-center outline-none text-xs font-bold bg-slate-300 text-slate-700 cursor-not-allowed select-none"
                      />
                    </div>
                  </div>

                  {/* Buying stats row inputs (Nbre colis, Colissage, Quantité) */}
                  <div className="grid grid-cols-3 gap-2 border-t border-gray-300 pt-2 bg-slate-300/30 p-1.5 rounded">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-800">Nbre colis</label>
                      <input
                        type="number"
                        min="0"
                        value={prodNbreColis}
                        onChange={(e) => handleNbreColisChange(e.target.value)}
                        className="w-full h-6 px-1.5 bg-white border border-t-[#808080] border-l-[#808080] border-b-white border-r-white font-mono text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-800">Colisage</label>
                      <input
                        type="number"
                        min="1"
                        value={prodColisage}
                        onChange={(e) => handleColisageChange(e.target.value)}
                        className="w-full h-6 px-1.5 bg-white border border-t-[#808080] border-l-[#808080] border-b-white border-r-white font-mono text-center outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-800">Quantité d'unités</label>
                      <input
                        type="number"
                        min="0"
                        value={prodQtyCalculated || ''}
                        onChange={(e) => handleQtyChange(e.target.value)}
                        className="w-full h-6 px-1.5 bg-white border border-t-[#808080] border-l-[#808080] border-b-white border-r-white font-mono text-center text-blue-900 font-bold outline-none"
                      />
                    </div>
                  </div>

                  {/* Prices: Prix de revient (previous), Prix Achat, Nouveau prix de revient */}
                  <div className="grid grid-cols-3 gap-2 border-b border-gray-300 pb-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-800">Prix de revient</label>
                      <input
                        type="text"
                        value={prodPrixDeRevient ? `${prodPrixDeRevient} DA` : '0 DA'}
                        readOnly
                        className="w-full h-6 px-1.5 bg-[#e4e0d8] border border-t-[#808080] border-l-[#808080] border-b-white border-r-white font-mono text-center outline-none text-xs font-bold text-gray-700 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-800">Prix Achat unitaire</label>
                      <input
                        type="number"
                        min="0"
                        value={prodPrixAchat}
                        onChange={(e) => {
                          setProdPrixAchat(e.target.value);
                          setProdNouveauPrixRevient(e.target.value);
                        }}
                        className="w-full h-6 px-1.5 bg-white border border-t-[#808080] border-l-[#808080] border-b-white border-r-white font-mono font-bold text-right text-red-900 text-xs outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-800">Nouveau prix revient</label>
                      <input
                        type="text"
                        value={`${calculatedNouveauPrixRevient || '0'} DA`}
                        readOnly
                        className="w-full h-6 px-1.5 bg-[#e4e0d8] border border-t-[#808080] border-l-[#808080] border-b-white border-r-white font-mono font-bold text-right text-blue-900 text-xs outline-none cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {/* SELL PRICES & MAGIN RULES ROW */}
                  <div className="border border-white/40 p-2.5 bg-[#cecac3]/50 rounded flex flex-col gap-1.5">
                    <span className="block font-sans font-bold text-blue-900 text-[11px] uppercase tracking-wider mb-1 border-b border-gray-300 pb-0.5">🚀 Tarifs de Vente & Marges</span>
                    
                    <div className="grid grid-cols-12 gap-2 items-center text-xs">
                      {/* PV 1 */}
                      <span className="col-span-3 font-bold text-gray-700">Prix Vente 1</span>
                      <input
                        type="number"
                        value={prodPrixVente1}
                        onChange={(e) => {
                          const val = e.target.value;
                          setProdPrixVente1(val);
                          setProdPrixVente2(val);
                          setProdPrixVente3(val);
                        }}
                        className="col-span-5 h-6 px-1.5 bg-white border border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-right font-bold outline-none text-xs"
                      />
                      <span className="col-span-1.5 font-bold text-gray-500 text-center font-sans text-[10px]">Marge:</span>
                      <div className="col-span-2.5 h-6 bg-white/70 border border-gray-300 px-1 flex items-center justify-center font-mono font-bold text-green-905">
                        {calculateMarginPercent(prodPrixVente1, prodPrixAchat)}
                      </div>
                    </div>

                    <div className="grid grid-cols-12 gap-2 items-center text-xs">
                      {/* PV 2 */}
                      <span className="col-span-3 font-bold text-gray-700">Prix Vente 2</span>
                      <input
                        type="number"
                        value={prodPrixVente2}
                        onChange={(e) => setProdPrixVente2(e.target.value)}
                        className="col-span-5 h-6 px-1.5 bg-white border border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-right font-bold outline-none text-xs"
                      />
                      <span className="col-span-1.5 font-bold text-gray-500 text-center font-sans text-[10px]">Marge:</span>
                      <div className="col-span-2.5 h-6 bg-white/70 border border-gray-300 px-1 flex items-center justify-center font-mono font-bold text-green-905">
                        {calculateMarginPercent(prodPrixVente2, prodPrixAchat)}
                      </div>
                    </div>

                    <div className="grid grid-cols-12 gap-2 items-center text-xs">
                      {/* PV 3 */}
                      <span className="col-span-3 font-bold text-gray-700">Prix Vente 3</span>
                      <input
                        type="number"
                        value={prodPrixVente3}
                        onChange={(e) => setProdPrixVente3(e.target.value)}
                        className="col-span-5 h-6 px-1.5 bg-white border border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-right font-bold outline-none text-xs"
                      />
                      <span className="col-span-1.5 font-bold text-gray-500 text-center font-sans text-[10px]">Marge:</span>
                      <div className="col-span-2.5 h-6 bg-white/70 border border-gray-300 px-1 flex items-center justify-center font-mono font-bold text-green-905">
                        {calculateMarginPercent(prodPrixVente3, prodPrixAchat)}
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 2: PLUS D'INFO */}
              {activeDialogTab === 'plus_info' && (
                <div className="flex flex-col gap-2.5">
                  <span className="block font-bold text-blue-900 border-b border-gray-400 pb-1 text-xs">
                    Informations Complémentaires
                  </span>

                  <div className="grid grid-cols-3 gap-2 items-center">
                    <span className="font-bold">Aisle/Rayon</span>
                    <input
                      type="text"
                      className="col-span-2 h-6 px-2 bg-white border border-t-[#808080] border-l-[#808080] border-b-white border-r-white"
                      value={infoRayon}
                      onChange={(e) => setInfoRayon(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2 items-center">
                    <span className="font-bold">Unité de Vente</span>
                    <select
                      className="col-span-2 h-6 px-1 bg-white border border-t-[#808080] border-l-[#808080] border-b-white border-r-white"
                      value={infoUnite}
                      onChange={(e) => setInfoUnite(e.target.value)}
                    >
                      <option value="Boite">Boite / Bouteille</option>
                      <option value="Carton">Carton entier</option>
                      <option value="Sachet">Sachet / Unitaire</option>
                      <option value="Kilogramme">Kilo (Kg)</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-3 gap-2 items-center">
                    <span className="font-bold">TVA Applicable</span>
                    <select
                      className="col-span-2 h-6 px-1 bg-white border border-t-[#808080] border-l-[#808080] border-b-white border-r-white"
                      value={infoTvaPercent}
                      onChange={(e) => setInfoTvaPercent(e.target.value)}
                    >
                      <option value="0">Aucune TVA (0%)</option>
                      <option value="9">Taux Réduit (9%)</option>
                      <option value="19">Taux Normal (19%)</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-3 gap-2 items-center">
                    <span className="font-bold">Stock d'alerte Seuil</span>
                    <input
                      type="number"
                      className="col-span-2 h-6 px-2 bg-white border border-t-[#808080] border-l-[#808080] border-b-white border-r-white"
                      value={infoAlerteStock}
                      onChange={(e) => setInfoAlerteStock(e.target.value)}
                    />
                  </div>

                  <div className="bg-amber-50 border border-amber-300 p-2.5 rounded text-amber-900 mt-2 text-[11px] leading-tight font-sans">
                    <strong>💡 Remarque :</strong> Ces configurations supplémentaires affectent directement les avertissements visuels de rupture de stock de l'application et la facturation finale en douane.
                  </div>
                </div>
              )}

              {/* TAB 3: PHOTO PRODUIT */}
              {activeDialogTab === 'photo' && (
                <div className="flex flex-col gap-2.5 items-center bg-slate-350 p-4 border border-gray-400 rounded">
                  <span className="block font-bold text-gray-800 border-b border-gray-400 pb-1 text-center w-full">
                    Visuel Associé au Code
                  </span>
                  
                  {/* Photo Placeholder */}
                  <div className="w-32 h-32 bg-[#b6b2aa] border-2 border-b-white border-r-white border-t-gray-700 border-l-gray-700 flex flex-col items-center justify-center text-center p-2 text-[10px] text-gray-600 gap-1 mt-1 shadow-inner relative">
                    <span className="text-3xl">📷</span>
                    <span className="font-sans">Image Produit <br/>Non Définie</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => alert("Simulation d'importation d'image lancée. Veuillez choisir un fichier PNG/JPEG.")}
                    className="mt-2 px-3 h-6 bg-[#d4d0c8] border-2 border-t-white border-l-white border-b-[#404040] border-r-[#404040] text-xs font-bold active:bg-gray-250 hover:bg-white"
                  >
                    📁 Sélectionner un fichier
                  </button>

                  <span className="text-[10px] text-gray-500 font-sans mt-2">Pris en charge : JPG, PNG, GIF. Max 2 Mo.</span>
                </div>
              )}

            </div>

            {/* Modal Footer Controls */}
            <div className="bg-[#d4d0c8] p-2 flex justify-end gap-1.5 border-t border-gray-400">
              <button
                type="button"
                onClick={handleSaveProductFromModal}
                className="px-4 h-7 text-xs font-bold bg-[#d4d0c8] text-green-900 border-2 border-t-white border-l-white border-b-[#404040] border-r-[#404040] active:border-b-white active:border-r-white active:border-t-[#404040] active:border-l-[#404040] flex items-center gap-1 hover:bg-green-150"
              >
                <span>✔ OK</span>
              </button>

              <button
                type="button"
                onClick={() => setIsProductDialogOpen(false)}
                className="px-4 h-7 text-xs font-bold bg-[#d4d0c8] text-red-900 border-2 border-t-white border-l-white border-b-[#404040] border-r-[#404040] active:border-b-white active:border-r-white active:border-t-[#404040] active:border-l-[#404040] flex items-center gap-1 hover:bg-red-150"
              >
                <span>✕ ANNULER</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* SUPPLIER SELECTOR MODAL (Retro Windows style) */}
      {isSupplierSelectOpen && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs flex items-center justify-center z-[60] p-4 text-xs font-sans text-slate-800">
          <div className="bg-[#d4d0c8] w-[460px] border-2 border-t-white border-l-white border-b-black border-r-black shadow-lg flex flex-col p-1">
            {/* Header */}
            <div className="bg-[#000080] text-white px-2 py-1 font-bold flex justify-between items-center select-none text-xs">
              <span className="flex items-center gap-1">📁 Initialisation : Choisir ou Créer un Fournisseur</span>
              <button 
                type="button"
                onClick={() => setIsSupplierSelectOpen(false)}
                className="w-4 h-4 bg-[#d4d0c8] text-black border border-t-white border-l-white border-b-black border-r-black flex items-center justify-center font-bold text-[9px] hover:bg-red-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Sub-banner description */}
            <div className="bg-sky-50 text-sky-950 px-3 py-2 border-b border-gray-400 select-none text-[11px] leading-tight flex gap-2">
              <span className="text-sm">ℹ️</span>
              <div>
                <strong>Nouveau Bon d'Achat :</strong> Veuillez sélectionner un fournisseur existant ou en créer un nouveau à la volée pour continuer.
              </div>
            </div>

            {/* Type selector tabs */}
            <div className="flex bg-[#d4d0c8] border-b border-gray-400 pt-1.5 px-1.5 gap-1 select-none">
              <button
                type="button"
                onClick={() => setSupplierSelectType('existing')}
                className={`px-3 py-1 font-bold border-t border-l border-r rounded-t text-[11px] ${
                  supplierSelectType === 'existing'
                    ? 'bg-[#d4d0c8] border-white border-b-transparent text-slate-900 z-10 -mb-[1px]'
                    : 'bg-[#b6b2aa] border-t-gray-100 border-l-gray-100 border-r-gray-400 text-gray-700 hover:bg-gray-250'
                }`}
              >
                👥 Fournisseur existant
              </button>

              <button
                type="button"
                onClick={() => setSupplierSelectType('new')}
                className={`px-3 py-1 font-bold border-t border-l border-r rounded-t text-[11px] ${
                  supplierSelectType === 'new'
                    ? 'bg-[#d4d0c8] border-white border-b-transparent text-slate-900 z-10 -mb-[1px]'
                    : 'bg-[#b6b2aa] border-t-gray-100 border-l-gray-100 border-r-gray-400 text-gray-700 hover:bg-gray-250'
                }`}
              >
                ➕ Créer un nouveau fournisseur
              </button>
            </div>

            {/* Tab body container with vintage Bevel style */}
            <div className="p-3 bg-[#d4d0c8] border border-white border-t-transparent shadow-[inset_-1px_-1px_rgba(0,0,0,0.1),inset_1px_1px_white] flex-1">
              
              {/* TAB 1: EXISTING SUPPLIER */}
              {supplierSelectType === 'existing' && (
                <div className="flex flex-col gap-2.5">
                  <span className="text-gray-700 font-bold block text-[11px]">Choisissez parmi la liste :</span>
                  {suppliers.length === 0 ? (
                    <div className="bg-yellow-50 border border-yellow-300 p-3 rounded text-yellow-905 text-[11px] leading-tight font-sans">
                      ⚠️ Aucun fournisseur disponible dans votre base. <br/>
                      Veuillez cliquer sur le deuxième onglet <strong>"Créer un nouveau fournisseur"</strong> pour l'ajouter directement.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      <select
                        value={existingSupplierSelected}
                        onChange={(e) => setExistingSupplierSelected(e.target.value)}
                        className="w-full h-8 px-2 bg-white border border-t-[#808080] border-l-[#808080] border-b-white border-r-white text-xs outline-none font-bold text-blue-900"
                      >
                        {suppliers.map(s => (
                          <option key={s.id} value={s.name}>
                            {s.code} - {s.name} (Solde: {s.balance.toLocaleString('fr-FR')} DA)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: REGISTER NEW SUPPLIER ON THE FLY */}
              {supplierSelectType === 'new' && (
                <div className="flex flex-col gap-2.5 font-sans">
                  <span className="text-blue-900 font-bold block text-[11px] border-b border-gray-300 pb-0.5">🚀 Enregistrement Rapide Fournisseur</span>
                  
                  <div className="grid grid-cols-12 gap-2 items-center">
                    <label className="col-span-4 font-bold text-gray-700">Code Fournisseur</label>
                    <input
                      type="text"
                      value={quickSupplierCode}
                      onChange={(e) => setQuickSupplierCode(e.target.value)}
                      className="col-span-8 h-6 px-2 bg-gray-250 border border-t-[#808080] border-l-[#808080] border-b-white border-r-white font-mono font-bold outline-none text-xs text-blue-900"
                    />
                  </div>

                  <div className="grid grid-cols-12 gap-2 items-center">
                    <label className="col-span-4 font-bold text-gray-700">Nom / Raison Sociale <span className="text-red-650">*</span></label>
                    <input
                      type="text"
                      placeholder="Ex: LARBI HAMIZ"
                      value={quickSupplierName}
                      onChange={(e) => setQuickSupplierName(e.target.value)}
                      className="col-span-8 h-6 px-2 bg-white border border-t-[#808080] border-l-[#808080] border-b-white border-r-white outline-none font-bold text-xs"
                    />
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer Controls */}
            <div className="bg-[#d4d0c8] p-2 flex justify-end gap-1.5 border-t border-gray-400 select-none">
              <button
                type="button"
                onClick={handleConfirmSupplierForVoucher}
                disabled={supplierSelectType === 'existing' && suppliers.length === 0}
                className="px-4 h-7 text-xs font-bold bg-[#d4d0c8] text-green-905 border-2 border-t-white border-l-white border-b-[#404040] border-r-[#404040] active:border-b-white active:border-r-white active:border-t-[#404040] active:border-l-[#404040] flex items-center gap-1 hover:bg-green-150 disabled:opacity-50"
              >
                <span>✔ Créer le bon</span>
              </button>

              <button
                type="button"
                onClick={() => setIsSupplierSelectOpen(false)}
                className="px-4 h-7 text-xs font-bold bg-[#d4d0c8] text-red-905 border-2 border-t-white border-l-white border-b-[#404040] border-r-[#404040] active:border-b-white active:border-r-white active:border-t-[#404040] active:border-l-[#404040] flex items-center gap-1 hover:bg-red-150"
              >
                <span>✕ Annuler</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODE DE PAIEMENT RETRO MODAL */}
      {isPaymentDialogOpen && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs flex items-center justify-center z-[80] p-4 text-xs font-sans text-slate-950 select-none">
          <div className="w-[520px] max-w-full bg-white dark:bg-slate-900 border border-slate-200/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Title Bar */}
            <div className="bg-m3-primary dark:bg-slate-950 px-5 py-4 flex items-center justify-between select-none">
              <span className="text-white font-bold font-display text-sm flex items-center gap-2">
                💰 Saisie du Règlement & Fermeture Bon
              </span>
              <button 
                onClick={() => setIsPaymentDialogOpen(false)}
                className="w-7 h-7 bg-white/10 text-white rounded-full flex items-center justify-center font-bold hover:bg-white/20 transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Dropdown Select Mode */}
            <div className="p-4 px-5 bg-slate-50 dark:bg-slate-950/40 flex items-center gap-4 border-b border-slate-100 dark:border-slate-800">
              <span className="font-extrabold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wide">Mode de paiement:</span>
              <select
                value={paymentMode}
                onChange={(e) => {
                  const modeVal = e.target.value;
                  setPaymentMode(modeVal);
                  if (modeVal === 'A_TERME') {
                    setPaymentVersement(0);
                  } else {
                    setPaymentVersement(draftMetrics.ttc);
                  }
                }}
                className="flex-1 max-w-[240px] h-9 bg-white dark:bg-slate-900 border border-slate-200/10 rounded-xl font-bold px-3 outline-none text-xs text-m3-primary dark:text-sky-400"
              >
                <option value="ESPECE">ESPÈCE / CASH</option>
                <option value="A_TERME">A TERME (CRÉDIT PARTENAIRE)</option>
                <option value="CHEQUE">CHEQUE / VIREMENT BANCAIRE</option>
              </select>
            </div>

            {/* Main Fields block */}
            <div className="p-5 flex flex-col md:flex-row gap-4 flex-1">
              
              {/* Left Column (Balances Calculations) */}
              <div className="flex-1 flex flex-col gap-2.5 p-4 bg-slate-50/70 dark:bg-slate-950/30 border border-slate-250/10 rounded-2xl shadow-xs">
                
                {/* Previous supplier balance */}
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-wide">Ancien Solde Tier:</span>
                  <div className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 font-mono font-bold text-xs text-slate-700 dark:text-slate-300 rounded-lg min-w-[120px] text-right">
                    {(draftMetrics.oldBalance).toLocaleString('fr-FR', { minimumFractionDigits: 1 })} DA
                  </div>
                </div>

                {/* Amount of current voucher */}
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-m3-primary dark:text-sky-400 text-[10px] uppercase tracking-wide">Net à Payer:</span>
                  <div className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 font-mono font-black text-xs text-m3-primary dark:text-sky-400 rounded-lg min-w-[120px] text-right">
                    {(draftMetrics.ttc).toLocaleString('fr-FR', { minimumFractionDigits: 1 })} DA
                  </div>
                </div>

                {/* Total balance accumulated */}
                <div className="flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800 pt-2.5">
                  <span className="font-bold text-indigo-900 dark:text-indigo-400 text-[10px] uppercase tracking-wide">Amortissement total:</span>
                  <div className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 font-mono font-bold text-xs text-indigo-950 dark:text-indigo-350 rounded-lg min-w-[120px] text-right">
                    {(draftMetrics.oldBalance + draftMetrics.ttc).toLocaleString('fr-FR', { minimumFractionDigits: 1 })} DA
                  </div>
                </div>

                {/* Input for versement */}
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-rose-500 text-[10px] uppercase tracking-wide">Mon Versement:</span>
                  <input
                    type="number"
                    value={paymentVersement || ''}
                    onChange={(e) => setPaymentVersement(Number(e.target.value) || 0)}
                    disabled={paymentMode === 'A_TERME'}
                    className={`w-[120px] h-8 bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-lg px-2.5 text-right font-mono font-black text-rose-600 dark:text-rose-400 text-xs outline-none ${
                      paymentMode === 'A_TERME' ? 'opacity-40 cursor-not-allowed' : 'focus:border-rose-500'
                    }`}
                    autoFocus={paymentMode !== 'A_TERME'}
                    onFocus={(e) => e.target.select()}
                  />
                </div>

                {/* Calculated new rest balance */}
                <div className="flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800 pt-2.5">
                  <span className="font-bold text-slate-850 dark:text-slate-200 text-[10px] uppercase tracking-wide">Nouveau Solde Tier:</span>
                  <div className="px-3 py-1.5 bg-slate-100 dark:bg-slate-950 font-mono font-black text-xs text-rose-600 dark:text-rose-400 rounded-lg min-w-[120px] text-right">
                    {((draftMetrics.oldBalance + draftMetrics.ttc) - paymentVersement).toLocaleString('fr-FR', { minimumFractionDigits: 1 })} DA
                  </div>
                </div>

              </div>

              {/* Right Column (Sources and description) */}
              <div className="w-full md:w-44 flex flex-col gap-2.5 font-sans">
                <span className="font-bold text-slate-500 dark:text-slate-400 text-[9.5px] uppercase tracking-wide block border-b border-slate-100 dark:border-slate-800 pb-1">
                  Trésorerie d'affectation
                </span>
                <select
                  value={paymentSource}
                  onChange={(e) => setPaymentSource(e.target.value)}
                  className="w-full h-8.5 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-xl font-bold px-3 outline-none text-xs text-slate-800 dark:text-slate-200"
                >
                  <option value="CAISSE PRINCIPALE">CAISSE PRINCIPALE</option>
                  <option value="COFFRE N°1">COFFRE N°1</option>
                  <option value="COFFRE N°2">COFFRE N°2</option>
                </select>
                
                <div className="mt-auto bg-slate-100 dark:bg-slate-950/60 p-3.5 rounded-xl text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed border border-slate-150/10">
                  Veuillez spécifier le montant effectivement versé au fournisseur. Le reliquat sera inscrit dans son grand livre.
                </div>
              </div>

            </div>

            {/* Modal Actions */}
            <div className="bg-slate-50 dark:bg-slate-950 p-4 px-5 flex justify-end gap-2.5 border-t border-slate-100 dark:border-slate-800 select-none">
              <button
                type="button"
                onClick={() => setIsPaymentDialogOpen(false)}
                className="px-5 h-9 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-full hover:bg-slate-100 transition-all cursor-pointer"
              >
                ✕ Annuler
              </button>

              <button
                type="button"
                onClick={handleConfirmPaymentAndSaveVoucher}
                className="px-6 h-9 text-xs font-black bg-m3-primary text-white rounded-full shadow-md hover:opacity-90 active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
              >
                ✓ Enregistrer Bon (F5)
              </button>
            </div>

          </div>
        </div>
      )}

      {/* -------------------- CUSTOM RETRO CONFIRM / ALERT DIALOG BOX -------------------- */}
      {retroDialog.isOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999] select-none">
          <div className="w-[420px] bg-[#d4d0c8] border-2 border-t-white border-l-white border-b-[#404040] border-r-[#404040] p-0.5 shadow-2xl">
            
            {/* Dialog Blue Title Bar */}
            <div className="bg-[#000080] text-white px-2 py-1 flex items-center justify-between font-bold text-xs">
              <span className="flex items-center gap-1.5">
                <span>📁</span>
                <span>{retroDialog.title}</span>
              </span>
              <button
                onClick={() => setRetroDialog(prev => ({ ...prev, isOpen: false }))}
                className="w-4 h-4 bg-[#d4d0c8] text-black border border-t-white border-l-white border-b-[#404040] border-r-[#404040] active:border-t-[#404040] active:border-l-[#404040] active:border-b-white active:border-r-white flex items-center justify-center font-bold text-[9px] cursor-default focus:outline-none"
              >
                ✕
              </button>
            </div>

            {/* Dialog Contents */}
            <div className="p-4 flex gap-4 text-xs font-bold text-slate-800 items-start select-text leading-relaxed bg-gray-50/50 m-1 border-t border-b border-t-[#808080] border-b-[#ffffff] border-l-[#808080] border-r-[#ffffff]">
              {/* Question / Icon */}
              <div className="text-3xl select-none flex-shrink-0">
                {retroDialog.type === 'confirm' ? '❓' : '⚠️'}
              </div>
              <div className="flex-1 whitespace-pre-wrap pt-1 select-all selection:bg-[#000080] selection:text-white">
                {retroDialog.message}
              </div>
            </div>

            {/* Dialog Action Buttons */}
            <div className="p-2 flex justify-end gap-2 bg-[#d4d0c8]">
              {retroDialog.type === 'confirm' ? (
                <>
                  <button
                    onClick={() => {
                      if (retroDialog.onConfirm) retroDialog.onConfirm();
                      setRetroDialog(prev => ({ ...prev, isOpen: false }));
                    }}
                    className="px-5 h-7 text-xs font-semibold bg-[#d4d0c8] text-black border border-t-white border-l-white border-b-[#404040] border-r-[#404040] active:border-b-white active:border-r-white active:border-t-[#404040] active:border-l-[#404040] hover:bg-gray-200 focus:outline-none shadow-sm"
                  >
                    Oui
                  </button>
                  <button
                    onClick={() => setRetroDialog(prev => ({ ...prev, isOpen: false }))}
                    className="px-5 h-7 text-xs font-semibold bg-[#d4d0c8] text-black border border-t-white border-l-white border-b-[#404040] border-r-[#404040] active:border-b-white active:border-r-white active:border-t-[#404040] active:border-l-[#404040] hover:bg-gray-200 focus:outline-none shadow-sm"
                  >
                    Non (Annuler)
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setRetroDialog(prev => ({ ...prev, isOpen: false }))}
                  className="px-6 h-7 text-xs font-semibold bg-[#d4d0c8] text-black border border-t-white border-l-white border-b-[#404040] border-r-[#404040] active:border-b-white active:border-r-white active:border-t-[#404040] active:border-l-[#404040] hover:bg-gray-200 focus:outline-none shadow-sm"
                >
                  OK (Valider)
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ==================== VINTAGE MANAGE FAMILIES DIALOG ==================== */}
      {isManagingFamilies && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-[100] p-2 backdrop-blur-[1px]">
          <div className="w-[430px] bg-[#d4d0c8] border-2 border-t-white border-l-white border-b-[#404040] border-r-[#404040] shadow-2xl flex flex-col p-[2px] font-mono text-xs text-black">
            
            {/* Title bar */}
            <div className="bg-[#000080] text-white font-sans font-bold px-1.5 py-1 flex justify-between items-center select-none">
              <span className="flex items-center gap-1">🏷️ GÉRER LES FAMILLES</span>
              <button 
                onClick={() => {
                  setIsManagingFamilies(false);
                  setNewFamilyInputName('');
                  setEditingFamilyName(null);
                }}
                className="w-4 h-4 bg-[#d4d0c8] text-black font-extrabold flex items-center justify-center border border-white hover:bg-red-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Content area with inset vintage border */}
            <div className="p-3 bg-[#d4d0c8] border border-white border-t-transparent shadow-[inset_-1px_-1px_rgba(0,0,0,0.1),inset_1px_1px_white] flex-1 flex flex-col gap-3">
              
              {/* Quick Add Section */}
              <div className="p-2 border border-t-[#808080] border-l-[#808080] border-b-white border-r-white bg-gray-100 flex flex-col gap-1">
                <span className="font-bold text-[10px] text-blue-900">AJOUTER UNE FAMILLE:</span>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="Ex: HUILES, LAITAGES..."
                    value={newFamilyInputName}
                    onChange={(e) => setNewFamilyInputName(e.target.value)}
                    className="flex-1 h-6 px-1.5 bg-white border border-t-[#808080] border-l-[#808080] border-b-white border-r-white outline-none text-xs font-bold text-slate-800 uppercase"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const trimmed = newFamilyInputName.trim().toUpperCase();
                        if (trimmed) {
                          setCreatedFamilles(prev => {
                            if (prev.includes(trimmed)) return prev;
                            return [...prev, trimmed].sort();
                          });
                          setProdFamille(trimmed);
                          setNewFamilyInputName('');
                        }
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const trimmed = newFamilyInputName.trim().toUpperCase();
                      if (trimmed) {
                        setCreatedFamilles(prev => {
                          if (prev.includes(trimmed)) return prev;
                          return [...prev, trimmed].sort();
                        });
                        setProdFamille(trimmed);
                        setNewFamilyInputName('');
                      }
                    }}
                    className="px-3 h-6 bg-[#d4d0c8] text-black border border-t-white border-l-white border-b-[#404040] border-r-[#404040] active:border-b-white active:border-r-white active:border-t-[#404040] active:border-l-[#404040] hover:bg-gray-200 text-xs font-bold"
                  >
                    Ajouter
                  </button>
                </div>
              </div>

              {/* Families List */}
              <div className="flex flex-col gap-1">
                <span className="font-bold text-[10px] text-slate-600">FAMILLES ENREGISTRÉES ({familles.length}):</span>
                
                <div className="max-h-[180px] overflow-y-auto bg-white border border-t-[#808080] border-l-[#808080] border-b-white border-r-white p-1">
                  {familles.length === 0 ? (
                    <div className="p-4 text-center text-slate-400 italic">Aucune famille enregistrée.</div>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {familles.map((fam) => {
                        const isEditingThis = editingFamilyName === fam;
                        return (
                          <div 
                            key={fam}
                            className="flex items-center justify-between p-1 bg-slate-100 border border-slate-300 rounded"
                          >
                            {isEditingThis ? (
                              <div className="flex-1 flex gap-1 items-center">
                                <input
                                  type="text"
                                  value={editingFamilyValue}
                                  onChange={(e) => setEditingFamilyValue(e.target.value)}
                                  className="flex-1 h-5 px-1 bg-white border border-t-[#808080] border-l-[#808080] border-b-white border-r-white outline-none font-bold uppercase text-xs"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleRenameFamily(fam, editingFamilyValue);
                                      setEditingFamilyName(null);
                                    } else if (e.key === 'Escape') {
                                      setEditingFamilyName(null);
                                    }
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleRenameFamily(fam, editingFamilyValue);
                                    setEditingFamilyName(null);
                                  }}
                                  className="w-5 h-5 bg-green-100 text-green-800 border border-white border-b-green-800 border-r-green-800 flex items-center justify-center font-bold text-[10px]"
                                >
                                  ✔
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingFamilyName(null)}
                                  className="w-5 h-5 bg-red-100 text-red-800 border border-white border-b-red-800 border-r-red-800 flex items-center justify-center font-bold text-[10px]"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <>
                                <span className="font-bold text-slate-800 uppercase pl-1 truncate max-w-[200px]">
                                  {fam}
                                </span>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingFamilyName(fam);
                                      setEditingFamilyValue(fam);
                                    }}
                                    className="px-1.5 h-5 bg-[#d4d0c8] text-black border border-t-white border-l-white border-b-[#404040] border-r-[#404040] active:border-b-white active:border-r-white active:border-t-[#404040] active:border-l-[#404040] hover:bg-gray-200 text-[10px]"
                                    title="Renommer la famille"
                                  >
                                    Renommer
                                  </button>
                                  {confirmDeleteFam === fam ? (
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          handleDeleteFamily(fam);
                                          setConfirmDeleteFam(null);
                                        }}
                                        className="px-1.5 h-5 bg-red-600 text-white border border-t-red-300 border-l-red-300 border-b-red-800 border-r-red-800 font-bold text-[10px]"
                                        title="Confirmer la suppression"
                                      >
                                        Oui
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setConfirmDeleteFam(null)}
                                        className="px-1.5 h-5 bg-gray-200 text-black border border-t-white border-l-white border-b-black border-r-black active:border-b-white active:border-r-white active:border-t-[#404040] active:border-l-[#404040] hover:bg-gray-300 text-[10px]"
                                      >
                                        Non
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setConfirmDeleteFam(fam);
                                      }}
                                      className="px-1.5 h-5 bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 text-[10px]"
                                      title="Supprimer la famille"
                                    >
                                      Suppr.
                                    </button>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Dialog buttons block */}
            <div className="p-2 flex justify-end gap-2 bg-[#d4d0c8] border-t border-gray-300">
              <button
                onClick={() => {
                  setIsManagingFamilies(false);
                  setNewFamilyInputName('');
                  setEditingFamilyName(null);
                }}
                className="px-6 h-7 text-xs font-semibold bg-[#d4d0c8] text-black border border-t-white border-l-white border-b-[#404040] border-r-[#404040] active:border-b-white active:border-r-white active:border-t-[#404040] active:border-l-[#404040] hover:bg-gray-200 focus:outline-none shadow-sm"
              >
                Fermer
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
