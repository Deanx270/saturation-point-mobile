import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Image,
  RefreshControl,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { theme } from '../../theme';
import apiClient from '../../api/client';
import AtelierText from '../../components/common/AtelierText';
import AtelierInput from '../../components/common/AtelierInput';
import AtelierButton from '../../components/common/AtelierButton';
import AtelierCard from '../../components/common/AtelierCard';
import AtelierPressable from '../../components/common/AtelierPressable';
import AtelierBottomSheet from '../../components/common/AtelierBottomSheet';
import AtelierToast from '../../components/common/AtelierToast';
import AtelierEmptyState from '../../components/common/AtelierEmptyState';
import AtelierErrorBanner from '../../components/common/AtelierErrorBanner';
import AtelierSkeleton from '../../components/common/AtelierSkeleton';
import AtelierHeader from '../../components/common/AtelierHeader';
import AtelierBrandMark from '../../components/common/AtelierBrandMark';
import {
  fetchProducts,
  fetchProductFilters,
  fetchActivePromotions,
  setSearchKeyword,
  setSelectedCategory,
  setSelectedBrand,
  setPriceFilter,
  setMinRating,
  setOnSaleOnly,
  resetFilters,
  syncProductSnapshot,
} from '../../redux/productsSlice';
import { addToCart, selectCartItems } from '../../redux/cartSlice';
import {
  formatPrice,
  isValidRemoteOrLocalUri,
  resolveProductPricing,
  optimizeImageUrl,
} from '../../utils/formatters';

const SHOP_PAGE_LIMIT = 8;

const RATING_OPTIONS = [
  { label: 'Any', value: '', star: false },
  { label: '3+', value: '3', star: true },
  { label: '4+', value: '4', star: true },
  { label: '4.5+', value: '4.5', star: true },
];

export const ProductListScreen = ({ route, navigation }) => {
  const dispatch = useDispatch();
  const cartItems = useSelector(selectCartItems);
  const { user } = useSelector((state) => state.auth);
  const isAdmin = user?.role === 'admin';
  const {
    items,
    page,
    total,
    hasMore,
    categories,
    brands,
    loading,
    loadingMore,
    error,
    searchKeyword,
    selectedCategory,
    selectedBrand,
    minPrice,
    maxPrice,
    minRating,
    onSaleOnly,
    activePromoCount,
  } = useSelector((state) => state.products);

  const [searchInput, setSearchInput] = useState(searchKeyword);
  const [fetchStarted, setFetchStarted] = useState(items.length > 0);
  const [promoFilter, setPromoFilter] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [addingProductId, setAddingProductId] = useState(null);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [minPriceDraft, setMinPriceDraft] = useState(minPrice);
  const [maxPriceDraft, setMaxPriceDraft] = useState(maxPrice);
  const [brandDraft, setBrandDraft] = useState(selectedBrand);
  const [ratingDraft, setRatingDraft] = useState(minRating);
  const [onSaleDraft, setOnSaleDraft] = useState(onSaleOnly);
  const [toastState, setToastState] = useState({
    visible: false,
    message: '',
    key: 0,
  });
  const activeRequestRef = useRef(null);
  const promoSignatureRef = useRef('');

  const incomingPromoIds = Array.isArray(route?.params?.promoProductIds)
    ? route.params.promoProductIds.filter(Boolean)
    : [];
  const incomingPromoKey = incomingPromoIds.join(',');

  useEffect(() => {
    if (!incomingPromoKey) {
      return;
    }
    dispatch(resetFilters());
    setSearchInput('');
    setPromoFilter({
      promotionId: route?.params?.promotionId || '',
      productIds: incomingPromoIds,
      discountPercent: Number(route?.params?.discountPercent) || 0,
      promoTitle: route?.params?.promoTitle || '',
    });
  }, [
    incomingPromoKey,
    route?.params?.promotionId,
    route?.params?.discountPercent,
    route?.params?.promoTitle,
    dispatch,
  ]);

  useEffect(() => {
    dispatch(fetchProductFilters());
  }, [dispatch]);

  const promoIdsParam = promoFilter?.productIds?.length
    ? promoFilter.productIds.join(',')
    : undefined;
  const activePromoDiscount =
    promoFilter &&
    promoFilter.discountPercent > 0 &&
    promoFilter.discountPercent < 100
      ? promoFilter.discountPercent
      : 0;

  const loadPage = useCallback(
    (targetPage = 1) => {
      if (targetPage === 1 && activeRequestRef.current) {
        activeRequestRef.current.abort();
      }
      const promise = dispatch(
        fetchProducts({
          target: 'shop',
          page: targetPage,
          limit: SHOP_PAGE_LIMIT,
          ids: promoIdsParam,
          onSale: onSaleOnly ? 'true' : undefined,
          keyword: searchKeyword || undefined,
          category: selectedCategory === 'All' ? undefined : selectedCategory,
          brand: selectedBrand === 'All' ? undefined : selectedBrand,
          minPrice: minPrice || undefined,
          maxPrice: maxPrice || undefined,
          minRating: minRating || undefined,
        })
      );
      activeRequestRef.current = promise;
      return promise;
    },
    [
      dispatch,
      promoIdsParam,
      onSaleOnly,
      searchKeyword,
      selectedCategory,
      selectedBrand,
      minPrice,
      maxPrice,
      minRating,
    ]
  );

  useEffect(() => {
    setFetchStarted(true);
    loadPage(1);
    return () => {
      if (activeRequestRef.current) {
        activeRequestRef.current.abort();
      }
    };
  }, [loadPage]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      dispatch(fetchActivePromotions()).then((action) => {
        if (!active || !fetchActivePromotions.fulfilled.match(action)) {
          return;
        }
        const promos = Array.isArray(action.payload?.promotions)
          ? action.payload.promotions
          : [];
        const activePromoIds = new Set(promos.map((p) => String(p._id)));
        const signature = promos
          .map((p) => `${p._id}:${p.discountPercent}:${(p.productIds || []).length}`)
          .join('|');

        if (promoFilter) {
          const isStalePromoFilter =
            promos.length === 0 ||
            (promoFilter.promotionId && !activePromoIds.has(String(promoFilter.promotionId)));
          if (isStalePromoFilter) {
            setPromoFilter(null);
            dispatch(setOnSaleOnly(false));
            if (navigation.setParams) {
              navigation.setParams({
                promotionId: undefined,
                promoProductIds: undefined,
                discountPercent: undefined,
                promoTitle: undefined,
              });
            }
          }
        } else if (onSaleOnly && promos.length === 0) {
          dispatch(setOnSaleOnly(false));
        }

        const hasStaleCardPromo = items.some(
          (it) =>
            it.activePromotion &&
            !activePromoIds.has(String(it.activePromotion._id))
        );

        if (
          (hasStaleCardPromo ||
            (promoSignatureRef.current && promoSignatureRef.current !== signature)) &&
          items.length > 0
        ) {
          loadPage(1);
        }
        promoSignatureRef.current = signature;
      });
      return () => {
        active = false;
      };
    }, [dispatch, loadPage, items, promoFilter, onSaleOnly, navigation])
  );

  useEffect(() => {
    if (searchInput === searchKeyword) {
      return undefined;
    }
    if (searchInput.trim() === '') {
      dispatch(setSearchKeyword(''));
      return undefined;
    }
    const handler = setTimeout(() => {
      dispatch(setSearchKeyword(searchInput));
    }, 150);
    return () => clearTimeout(handler);
  }, [searchInput, searchKeyword, dispatch]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPage(1);
    setRefreshing(false);
  };

  const handleLoadMore = useCallback(() => {
    if (!hasMore || loading || loadingMore) {
      return;
    }
    loadPage(page + 1);
  }, [hasMore, loading, loadingMore, loadPage, page]);

  const handleCategorySelect = (category) => {
    if (category === 'On Sale') {
      handleClearPromoFilter();
      dispatch(setSelectedCategory('All'));
      dispatch(setOnSaleOnly(!onSaleOnly));
      return;
    }
    dispatch(setOnSaleOnly(false));
    dispatch(setSelectedCategory(category));
  };

  const handleOpenFilterModal = () => {
    setMinPriceDraft(minPrice);
    setMaxPriceDraft(maxPrice);
    setBrandDraft(selectedBrand);
    setRatingDraft(minRating);
    setOnSaleDraft(onSaleOnly);
    setFilterModalVisible(true);
  };

  const handleApplyFilters = () => {
    dispatch(
      setPriceFilter({
        minPrice: minPriceDraft.trim(),
        maxPrice: maxPriceDraft.trim(),
      })
    );
    dispatch(setSelectedBrand(brandDraft || 'All'));
    dispatch(setMinRating(ratingDraft || ''));
    dispatch(setOnSaleOnly(onSaleDraft));
    setFilterModalVisible(false);
  };

  const handleClearPromoFilter = () => {
    setPromoFilter(null);
    dispatch(setOnSaleOnly(false));
    if (navigation.setParams) {
      navigation.setParams({
        promotionId: undefined,
        promoProductIds: undefined,
        discountPercent: undefined,
        promoTitle: undefined,
      });
    }
  };

  const handleClearAllFilters = () => {
    setSearchInput('');
    setMinPriceDraft('');
    setMaxPriceDraft('');
    setBrandDraft('All');
    setRatingDraft('');
    setOnSaleDraft(false);
    handleClearPromoFilter();
    dispatch(resetFilters());
    setFilterModalVisible(false);
  };

  const handleAddToCart = async (product) => {
    if (!product?._id || product.stock <= 0 || addingProductId === product._id) {
      return;
    }

    setAddingProductId(product._id);
    try {
      let latestProduct = product;
      try {
        const res = await apiClient.get(`/products/${product._id}`);
        if (res.data?._id) {
          latestProduct = res.data;
          dispatch(syncProductSnapshot(latestProduct));
        }
      } catch (e) {}

      const liveStock = Math.max(0, Number(latestProduct.stock) || 0);
      if (liveStock <= 0) {
        Alert.alert('Out of Stock', `${latestProduct.name} is currently out of stock.`);
        return;
      }

      const existingItem = cartItems.find((item) => item.product === latestProduct._id);
      const existingQty = existingItem ? existingItem.quantity : 0;
      if (existingQty >= liveStock) {
        Alert.alert(
          'Stock Limit Reached',
          `You already have the maximum available stock (${liveStock}) for ${latestProduct.name} in your cart.`
        );
        return;
      }

      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (e) {}

      const pricing = resolveProductPricing(latestProduct, activePromoDiscount);

      dispatch(
        addToCart({
          product: latestProduct._id,
          name: latestProduct.name,
          price: pricing.effectivePrice,
          originalPrice: pricing.basePrice,
          discountPercent: pricing.discountPercent,
          image: latestProduct.images?.[0] || '',
          brand: latestProduct.brand,
          stock: liveStock,
        })
      );
      setToastState({
        visible: true,
        message: `${latestProduct.name} added to cart`,
        key: Date.now(),
      });
    } finally {
      setAddingProductId(null);
    }
  };

  const hasActiveFilter = Boolean(
    minPrice ||
    maxPrice ||
    minRating ||
    onSaleOnly ||
    (selectedBrand && selectedBrand !== 'All')
  );

  const chipCategories =
    activePromoCount > 0 || onSaleOnly
      ? ['All', 'On Sale', ...categories.filter((c) => c !== 'All')]
      : categories;

  const renderProductItem = ({ item }) => {
    const firstImage = item.images && item.images.length > 0 ? item.images[0] : '';
    const hasImage = isValidRemoteOrLocalUri(firstImage);
    const existingCartItem = cartItems.find((entry) => entry.product === item._id);
    const inCartQty = existingCartItem ? existingCartItem.quantity : 0;
    const isOutOfStock = (Number(item.stock) || 0) <= 0;
    const pricing = resolveProductPricing(
      item,
      activePromoDiscount,
      promoFilter?.promoTitle || ''
    );

    return (
      <View style={styles.gridItemContainer}>
        <AtelierCard
          style={styles.productCard}
          onPress={() =>
            navigation.navigate(
              'ProductDetails',
              pricing.hasPromo
                ? {
                    productId: item._id,
                    discountPercent: pricing.discountPercent,
                    promoTitle: pricing.promoTitle,
                  }
                : { productId: item._id }
            )
          }
        >
          <View style={styles.imageWrapper}>
            {hasImage ? (
              <Image
                source={{
                  uri: optimizeImageUrl(firstImage, {
                    width: 180,
                    height: 180,
                    crop: 'fill',
                  }),
                }}
                style={[
                  styles.productImage,
                  isOutOfStock && styles.productImageOutOfStock,
                ]}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons
                  name="image-outline"
                  size={28}
                  color={theme.colors.inkMuted}
                />
              </View>
            )}
            {isOutOfStock ? (
              <View
                pointerEvents="none"
                style={styles.outOfStockWash}
              />
            ) : null}
            {isOutOfStock ? (
              <View
                pointerEvents="none"
                style={styles.outOfStockPill}
              >
                <AtelierText
                  variant="overline"
                  color={theme.colors.inkSecondary}
                  style={styles.outOfStockText}
                >
                  Out of Stock
                </AtelierText>
              </View>
            ) : pricing.hasPromo ? (
              <View style={styles.cardPromoBadge}>
                <AtelierText
                  variant="caption"
                  color={theme.colors.goldText}
                  style={styles.cardPromoBadgeText}
                >
                  {`${pricing.discountPercent}% OFF`}
                </AtelierText>
              </View>
            ) : null}
          </View>
          <View style={styles.cardDetails}>
            <AtelierText
              variant="caption"
              color={theme.colors.goldText}
              numberOfLines={1}
            >
              {item.brand}
            </AtelierText>
            <AtelierText
              variant="title2"
              numberOfLines={2}
              style={styles.productTitle}
            >
              {item.name}
            </AtelierText>
            <View style={styles.ratingRow}>
              <Ionicons
                name={item.numReviews > 0 ? 'star' : 'star-outline'}
                size={14}
                color={theme.colors.gold}
              />
              <AtelierText
                variant="bodySmall"
                color={theme.colors.inkSecondary}
                style={styles.ratingText}
              >
                {item.numReviews > 0
                  ? `${item.rating.toFixed(1)} (${item.numReviews})`
                  : 'No reviews'}
              </AtelierText>
            </View>
            <View style={styles.footerRow}>
              <View style={styles.priceColumn}>
                <AtelierText
                  variant="bodyLarge"
                  color={
                    isOutOfStock
                      ? theme.colors.inkMuted
                      : theme.colors.inkPrimary
                  }
                  numberOfLines={1}
                  style={styles.priceText}
                >
                  {formatPrice(pricing.effectivePrice)}
                </AtelierText>
                {pricing.hasPromo ? (
                  <AtelierText
                    variant="caption"
                    color={theme.colors.inkMuted}
                    numberOfLines={1}
                    style={styles.originalPriceText}
                  >
                    {formatPrice(item.price)}
                  </AtelierText>
                ) : null}
              </View>
              {!isAdmin ? (
                <View style={styles.quickAddWrapper}>
                  <AtelierPressable
                    tone="none"
                    stopPropagation
                    haptic="none"
                    hitSlop={8}
                    disabled={isOutOfStock || addingProductId === item._id}
                    pressedStyle={styles.quickAddPressed}
                    style={[
                      styles.quickAddButton,
                      inCartQty > 0 && styles.quickAddInCart,
                      isOutOfStock && styles.quickAddDisabled,
                    ]}
                    onPress={() => handleAddToCart(item)}
                    accessibilityLabel={`Add ${item.name} to cart`}
                  >
                    <View
                      style={[
                        styles.cartAddIcon,
                        isOutOfStock && styles.cartAddIconDisabled,
                      ]}
                    >
                      <Ionicons
                        name="cart-outline"
                        size={17}
                        color={
                          isOutOfStock
                            ? theme.colors.inkMuted
                            : inCartQty > 0
                            ? theme.colors.goldText
                            : theme.colors.inkPrimary
                        }
                        style={styles.cartIconGlyph}
                      />
                      <View
                        style={[
                          styles.cartPlusDot,
                          {
                            backgroundColor: isOutOfStock
                              ? theme.colors.surfaceSubtle
                              : inCartQty > 0
                              ? '#FEFDF7'
                              : theme.colors.surface,
                          },
                        ]}
                      >
                        <Ionicons
                          name="add"
                          size={9}
                          color={
                            isOutOfStock
                              ? theme.colors.inkMuted
                              : inCartQty > 0
                              ? theme.colors.goldText
                              : theme.colors.inkPrimary
                          }
                        />
                      </View>
                    </View>
                  </AtelierPressable>
                  {inCartQty > 0 ? (
                    <View
                      pointerEvents="none"
                      style={styles.quickAddBadge}
                    >
                      <AtelierText
                        variant="caption"
                        color="#FFFFFF"
                        style={styles.quickAddBadgeText}
                      >
                        {inCartQty > 99 ? '99+' : inCartQty}
                      </AtelierText>
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>
          </View>
        </AtelierCard>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <AtelierHeader
        leftType="drawer"
        navigation={navigation}
        centerComponent={<AtelierBrandMark variant="header" />}
      />

      <View style={styles.searchSection}>
        <View style={styles.searchInputContainer}>
          <AtelierInput
            placeholder="Search pens, inks, paper..."
            value={searchInput}
            onChangeText={setSearchInput}
            rightIcon={searchInput.length > 0 ? 'close-circle' : undefined}
            onRightIconPress={() => {
              setSearchInput('');
              dispatch(setSearchKeyword(''));
            }}
            rightIconAccessibilityLabel="Clear search"
            returnKeyType="search"
            onSubmitEditing={() => dispatch(setSearchKeyword(searchInput))}
            style={styles.searchInputWrapper}
          />
        </View>
        <AtelierPressable
          tone={hasActiveFilter ? 'solid' : 'surface'}
          style={[
            styles.filterIconButton,
            hasActiveFilter && styles.filterIconButtonActive,
          ]}
          onPress={handleOpenFilterModal}
          accessibilityLabel="Filter products"
        >
          <Ionicons
            name="options-outline"
            size={22}
            color={hasActiveFilter ? '#FFFFFF' : theme.colors.inkPrimary}
          />
        </AtelierPressable>
      </View>

      <View style={styles.categoryScrollWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {chipCategories.map((cat) => {
            const isOnSaleChip = cat === 'On Sale';
            const isSelected = isOnSaleChip
              ? onSaleOnly
              : !onSaleOnly && selectedCategory === cat;
            return (
              <AtelierPressable
                key={cat}
                tone={isSelected ? 'solid' : 'surface'}
                haptic="selection"
                hitSlop={6}
                style={[
                  styles.categoryChip,
                  isSelected && styles.categoryChipSelected,
                ]}
                onPress={() => handleCategorySelect(cat)}
              >
                <View style={styles.chipInnerRow}>
                  {isOnSaleChip ? (
                    <Ionicons
                      name="pricetag-outline"
                      size={13}
                      color={isSelected ? '#FFFFFF' : theme.colors.goldText}
                    />
                  ) : null}
                  <AtelierText
                    variant="caption"
                    color={
                      isSelected
                        ? '#FFFFFF'
                        : isOnSaleChip
                        ? theme.colors.goldText
                        : theme.colors.inkSecondary
                    }
                    style={styles.chipText}
                  >
                    {cat}
                  </AtelierText>
                </View>
              </AtelierPressable>
            );
          })}
        </ScrollView>
      </View>

      {promoFilter ? (
        <View style={styles.promoFilterBanner}>
          <View style={styles.promoFilterInfo}>
            <Ionicons
              name="pricetag-outline"
              size={16}
              color={theme.colors.goldText}
            />
            <AtelierText
              variant="caption"
              color={theme.colors.goldText}
              numberOfLines={1}
              style={styles.promoFilterLabel}
            >
              {`${promoFilter.promoTitle || 'Featured Promotion'}${
                activePromoDiscount > 0 ? ` — ${activePromoDiscount}% Off` : ''
              }`}
            </AtelierText>
          </View>
          <AtelierPressable
            tone="surface"
            hitSlop={6}
            onPress={handleClearPromoFilter}
            style={styles.promoClearChip}
          >
            <AtelierText
              variant="caption"
              color={theme.colors.inkPrimary}
            >
              Show All
            </AtelierText>
          </AtelierPressable>
        </View>
      ) : null}

      {error && (
        <AtelierErrorBanner
          message={error}
          onRetry={() => loadPage(1)}
        />
      )}

      {loading && items.length > 0 && !refreshing ? (
        <View style={styles.updatingRow}>
          <ActivityIndicator
            size="small"
            color={theme.colors.gold}
          />
          <AtelierText
            variant="caption"
            color={theme.colors.inkMuted}
          >
            Updating results...
          </AtelierText>
        </View>
      ) : null}

      {(loading || !fetchStarted) && items.length === 0 && !error ? (
        <View style={styles.skeletonContainer}>
          {[1, 2, 3, 4].map((n) => (
            <View
              key={n}
              style={styles.skeletonCard}
            >
              <AtelierCard style={styles.productCard}>
                <View style={styles.imageWrapper}>
                  <AtelierSkeleton
                    width="100%"
                    height="100%"
                    borderRadius={0}
                  />
                </View>
                <View style={styles.cardDetails}>
                  <AtelierSkeleton
                    height={13}
                    width="38%"
                    style={styles.skeletonBrand}
                  />
                  <View style={styles.skeletonTitleBox}>
                    <AtelierSkeleton
                      height={15}
                      width="92%"
                      style={styles.skeletonTitleLine}
                    />
                    <AtelierSkeleton
                      height={15}
                      width="64%"
                    />
                  </View>
                  <AtelierSkeleton
                    height={14}
                    width="48%"
                    style={styles.skeletonRating}
                  />
                  <View style={styles.footerRow}>
                    <AtelierSkeleton
                      height={17}
                      width="46%"
                    />
                    {!isAdmin ? (
                      <AtelierSkeleton
                        height={34}
                        width={34}
                        borderRadius={theme.radii.sm}
                      />
                    ) : null}
                  </View>
                </View>
              </AtelierCard>
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item._id}
          renderItem={renderProductItem}
          numColumns={2}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          initialNumToRender={6}
          maxToRenderPerBatch={6}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          contentContainerStyle={[
            styles.listContent,
            items.length === 0 && styles.emptyListContent,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.gold}
            />
          }
          ListFooterComponent={
            items.length > 0 ? (
              <View style={styles.listFooter}>
                {loadingMore ? (
                  <>
                    <ActivityIndicator
                      size="small"
                      color={theme.colors.gold}
                    />
                    <AtelierText
                      variant="bodySmall"
                      color={theme.colors.inkMuted}
                    >
                      Loading more products...
                    </AtelierText>
                  </>
                ) : (
                  <AtelierText
                    variant="caption"
                    color={theme.colors.inkMuted}
                  >
                    {hasMore
                      ? `Showing ${items.length} of ${total} items`
                      : `All ${total || items.length} items shown`}
                  </AtelierText>
                )}
              </View>
            ) : null
          }
          ListEmptyComponent={
            !error ? (
              <AtelierEmptyState
                iconName="search-outline"
                title="No Products Found"
                description="No products match your search or filters."
                actionTitle="Clear Filters"
                onActionPress={handleClearAllFilters}
              />
            ) : null
          }
        />
      )}

      <AtelierBottomSheet
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        title="Filter Products"
        maxHeight="82%"
        footer={
          <View style={styles.modalActions}>
            <AtelierButton
              title="Reset"
              variant="outline"
              singleLine
              onPress={handleClearAllFilters}
              style={styles.modalActionBtn}
            />
            <AtelierButton
              title="Apply"
              singleLine
              onPress={handleApplyFilters}
              style={styles.modalActionBtn}
            />
          </View>
        }
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={styles.modalScroll}
        >
          {(activePromoCount > 0 || onSaleDraft) ? (
            <>
              <AtelierText
                variant="caption"
                color={theme.colors.inkSecondary}
                style={styles.filterSectionLabel}
              >
                Promotions
              </AtelierText>
              <View style={styles.fixedChipsRow}>
                {[
                  { label: 'All Items', value: false },
                  { label: 'On Sale Only', value: true },
                ].map((option) => {
                  const isSelected = onSaleDraft === option.value;
                  return (
                    <AtelierPressable
                      key={option.label}
                      tone={isSelected ? 'solid' : 'surface'}
                      haptic="selection"
                      hitSlop={4}
                      onPress={() => setOnSaleDraft(option.value)}
                      style={[
                        styles.filterChip,
                        styles.fixedFilterChip,
                        isSelected && styles.filterChipSelected,
                      ]}
                    >
                      <AtelierText
                        variant="caption"
                        color={isSelected ? '#FFFFFF' : theme.colors.inkSecondary}
                      >
                        {option.label}
                      </AtelierText>
                    </AtelierPressable>
                  );
                })}
              </View>
            </>
          ) : null}

          <AtelierText
            variant="caption"
            color={theme.colors.inkSecondary}
            style={styles.filterSectionLabel}
          >
            Price Range (₱)
          </AtelierText>
          <View style={styles.priceInputsRow}>
            <View style={styles.priceInputColumn}>
              <AtelierInput
                label="Min Price"
                prefix="₱"
                placeholder="0"
                value={minPriceDraft}
                onChangeText={setMinPriceDraft}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.priceInputColumn}>
              <AtelierInput
                label="Max Price"
                prefix="₱"
                placeholder="20000"
                value={maxPriceDraft}
                onChangeText={setMaxPriceDraft}
                keyboardType="numeric"
              />
            </View>
          </View>

          <AtelierText
            variant="caption"
            color={theme.colors.inkSecondary}
            style={styles.filterSectionLabel}
          >
            Minimum Rating
          </AtelierText>
          <View style={styles.fixedChipsRow}>
            {RATING_OPTIONS.map((option) => {
              const isSelected = ratingDraft === option.value;
              return (
                <AtelierPressable
                  key={option.label}
                  tone={isSelected ? 'solid' : 'surface'}
                  haptic="selection"
                  hitSlop={4}
                  onPress={() => setRatingDraft(option.value)}
                  style={[
                    styles.filterChip,
                    styles.fixedFilterChip,
                    isSelected && styles.filterChipSelected,
                  ]}
                >
                  <View style={styles.ratingChipInner}>
                    {option.star ? (
                      <Ionicons
                        name="star"
                        size={12}
                        color={isSelected ? '#FFFFFF' : theme.colors.gold}
                      />
                    ) : null}
                    <AtelierText
                      variant="caption"
                      color={isSelected ? '#FFFFFF' : theme.colors.inkSecondary}
                    >
                      {option.label}
                    </AtelierText>
                  </View>
                </AtelierPressable>
              );
            })}
          </View>

          <AtelierText
            variant="caption"
            color={theme.colors.inkSecondary}
            style={styles.filterSectionLabel}
          >
            Brand
          </AtelierText>
          <View style={styles.filterChipsWrap}>
            {(brands || ['All']).map((brandName) => {
              const isSelected = brandDraft === brandName;
              return (
                <AtelierPressable
                  key={brandName}
                  tone={isSelected ? 'solid' : 'surface'}
                  haptic="selection"
                  hitSlop={4}
                  onPress={() => setBrandDraft(brandName)}
                  style={[
                    styles.filterChip,
                    isSelected && styles.filterChipSelected,
                  ]}
                >
                  <AtelierText
                    variant="caption"
                    color={isSelected ? '#FFFFFF' : theme.colors.inkSecondary}
                  >
                    {brandName}
                  </AtelierText>
                </AtelierPressable>
              );
            })}
          </View>
        </ScrollView>
      </AtelierBottomSheet>

      <AtelierToast
        visible={toastState.visible}
        toastKey={toastState.key}
        message={toastState.message}
        actionLabel="View Cart"
        onActionPress={() => navigation.navigate('CartTab')}
        onDismiss={() => setToastState((prev) => ({ ...prev, visible: false }))}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.canvas,
  },
  searchSection: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  searchInputContainer: {
    flex: 1,
  },
  searchInputWrapper: {
    marginBottom: theme.spacing.sm,
  },
  filterIconButton: {
    width: 50,
    height: 50,
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderMedium,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  filterIconButtonActive: {
    backgroundColor: theme.colors.inkPrimary,
    borderColor: theme.colors.inkPrimary,
  },
  categoryScrollWrapper: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: 6,
    overflow: 'hidden',
  },
  categoryScroll: {
    flexGrow: 1,
    paddingHorizontal: 0,
    gap: theme.spacing.sm,
  },
  categoryChip: {
    flexGrow: 1,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  categoryChipSelected: {
    backgroundColor: theme.colors.inkPrimary,
    borderColor: theme.colors.inkPrimary,
  },
  chipInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  chipText: {
    letterSpacing: 0.4,
  },
  listContent: {
    paddingHorizontal: 10,
    paddingBottom: theme.spacing.hero,
  },
  updatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
  },
  listFooter: {
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  gridItemContainer: {
    flex: 0.5,
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  productCard: {
    padding: 0,
    backgroundColor: theme.colors.surface,
  },
  imageWrapper: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: theme.colors.surfaceSubtle,
    position: 'relative',
    overflow: 'hidden',
  },
  cardPromoBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: theme.colors.goldLight,
    borderWidth: 1,
    borderColor: 'rgba(161, 98, 7, 0.28)',
    borderRadius: theme.radii.badge,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  cardPromoBadgeText: {
    fontSize: 10.5,
    lineHeight: 14,
    letterSpacing: 0.3,
  },
  promoFilterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.goldLight,
    borderWidth: 1,
    borderColor: 'rgba(161, 98, 7, 0.28)',
    gap: theme.spacing.sm,
  },
  promoFilterInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  promoFilterLabel: {
    flex: 1,
  },
  promoClearChip: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: theme.radii.sm,
    borderWidth: 1,
    borderColor: theme.colors.borderMedium,
    backgroundColor: theme.colors.surface,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  productImageOutOfStock: {
    opacity: 0.72,
  },
  outOfStockWash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(250, 249, 246, 0.42)',
  },
  outOfStockPill: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderWidth: 1,
    borderColor: theme.colors.borderMedium,
    borderRadius: theme.radii.badge,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  outOfStockText: {
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 0.7,
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardDetails: {
    padding: theme.spacing.md,
  },
  productTitle: {
    marginTop: 2,
    fontSize: 15,
    lineHeight: 20,
    minHeight: 40,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.xs,
  },
  ratingText: {
    marginLeft: 4,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing.sm,
  },
  priceColumn: {
    flexShrink: 1,
    minHeight: 36,
    justifyContent: 'center',
    marginRight: 6,
  },
  priceText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 15,
    lineHeight: 20,
  },
  originalPriceText: {
    textDecorationLine: 'line-through',
    fontSize: 11,
  },
  quickAddWrapper: {
    position: 'relative',
  },
  quickAddButton: {
    width: 34,
    height: 34,
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderMedium,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  quickAddInCart: {
    borderColor: theme.colors.gold,
    backgroundColor: '#FEFDF7',
  },
  cartAddIcon: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cartIconGlyph: {
    marginTop: 2,
    marginRight: 2,
  },
  cartPlusDot: {
    position: 'absolute',
    top: 0,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickAddBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 4,
    borderRadius: theme.radii.xs,
    backgroundColor: theme.colors.inkPrimary,
    borderWidth: 1,
    borderColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickAddBadgeText: {
    fontSize: 10,
    lineHeight: 12,
  },
  quickAddPressed: {
    backgroundColor: '#E7E5E4',
    borderColor: theme.colors.inkPrimary,
    transform: [{ scale: 0.94 }],
  },
  cartAddIconDisabled: {
    opacity: 0.38,
  },
  quickAddDisabled: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderColor: theme.colors.border,
  },
  skeletonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
  },
  skeletonCard: {
    width: '50%',
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  skeletonBrand: {
    marginBottom: 4,
  },
  skeletonTitleBox: {
    minHeight: 40,
    marginTop: 2,
    justifyContent: 'flex-start',
  },
  skeletonTitleLine: {
    marginBottom: 6,
  },
  skeletonRating: {
    marginTop: theme.spacing.xs,
  },
  modalScroll: {
    maxHeight: 360,
  },
  filterSectionLabel: {
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  fixedChipsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  filterChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  filterChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    minHeight: 40,
    borderRadius: theme.radii.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSubtle,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  fixedFilterChip: {
    flex: 1,
    paddingHorizontal: theme.spacing.xs,
  },
  ratingChipInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  filterChipSelected: {
    backgroundColor: theme.colors.inkPrimary,
    borderColor: theme.colors.inkPrimary,
  },
  priceInputsRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  priceInputColumn: {
    flex: 1,
  },
  modalActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  modalActionBtn: {
    flex: 1,
    paddingHorizontal: theme.spacing.md,
  },
});

export default ProductListScreen;
