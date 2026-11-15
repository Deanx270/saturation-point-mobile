import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Image,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  Modal,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { theme } from '../../theme';
import AtelierText from '../../components/common/AtelierText';
import AtelierInput from '../../components/common/AtelierInput';
import AtelierButton from '../../components/common/AtelierButton';
import AtelierCard from '../../components/common/AtelierCard';
import AtelierEmptyState from '../../components/common/AtelierEmptyState';
import AtelierErrorBanner from '../../components/common/AtelierErrorBanner';
import AtelierSkeleton from '../../components/common/AtelierSkeleton';
import CartIconBadge from '../../components/common/CartIcon';
import {
  fetchProducts,
  fetchProductFilters,
  setSearchKeyword,
  setSelectedCategory,
  setPriceFilter,
  resetFilters,
} from '../../redux/productsSlice';
import { addToCart } from '../../redux/cartSlice';
import { formatPrice, isValidRemoteOrLocalUri } from '../../utils/formatters';

export const ProductListScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const {
    items,
    categories,
    loading,
    error,
    searchKeyword,
    selectedCategory,
    minPrice,
    maxPrice,
  } = useSelector((state) => state.products);

  const [searchInput, setSearchInput] = useState(searchKeyword);
  const [refreshing, setRefreshing] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [minPriceDraft, setMinPriceDraft] = useState(minPrice);
  const [maxPriceDraft, setMaxPriceDraft] = useState(maxPrice);

  useEffect(() => {
    dispatch(fetchProductFilters());
  }, [dispatch]);

  const loadData = useCallback(() => {
    dispatch(
      fetchProducts({
        keyword: searchKeyword || undefined,
        category: selectedCategory === 'All' ? undefined : selectedCategory,
        minPrice: minPrice || undefined,
        maxPrice: maxPrice || undefined,
      })
    );
  }, [dispatch, searchKeyword, selectedCategory, minPrice, maxPrice]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const handler = setTimeout(() => {
      dispatch(setSearchKeyword(searchInput));
    }, 400);
    return () => clearTimeout(handler);
  }, [searchInput, dispatch]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleCategorySelect = (category) => {
    dispatch(setSelectedCategory(category));
  };

  const handleApplyPriceFilter = () => {
    dispatch(
      setPriceFilter({
        minPrice: minPriceDraft.trim(),
        maxPrice: maxPriceDraft.trim(),
      })
    );
    setFilterModalVisible(false);
  };

  const handleClearAllFilters = () => {
    setSearchInput('');
    setMinPriceDraft('');
    setMaxPriceDraft('');
    dispatch(resetFilters());
    setFilterModalVisible(false);
  };

  const handleAddToCart = async (product) => {
    if (product.stock <= 0) {
      return;
    }
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}

    dispatch(
      addToCart({
        product: product._id,
        name: product.name,
        price: product.price,
        image: product.images?.[0] || '',
        brand: product.brand,
        stock: product.stock,
      })
    );
    Alert.alert('Added to Cart', `${product.name} added to your cart.`);
  };

  const hasActivePriceFilter = Boolean(minPrice || maxPrice);

  const renderProductItem = ({ item }) => {
    const firstImage = item.images && item.images.length > 0 ? item.images[0] : '';
    const hasImage = isValidRemoteOrLocalUri(firstImage);

    return (
      <View style={styles.gridItemContainer}>
        <AtelierCard
          style={styles.productCard}
          onPress={() => navigation.navigate('ProductDetails', { productId: item._id })}
        >
          <View style={styles.imageWrapper}>
            {hasImage ? (
              <Image
                source={{ uri: firstImage }}
                style={styles.productImage}
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
              numberOfLines={1}
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
              <AtelierText
                variant="bodyLarge"
                color={theme.colors.inkPrimary}
                style={styles.priceText}
              >
                {formatPrice(item.price)}
              </AtelierText>
              <TouchableOpacity
                style={[
                  styles.quickAddButton,
                  item.stock <= 0 && styles.quickAddDisabled,
                ]}
                disabled={item.stock <= 0}
                onPress={() => handleAddToCart(item)}
              >
                <Ionicons
                  name="add"
                  size={20}
                  color={theme.colors.surface}
                />
              </TouchableOpacity>
            </View>
          </View>
        </AtelierCard>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerIconButton}
          onPress={() => navigation.openDrawer()}
        >
          <Ionicons
            name="menu-outline"
            size={26}
            color={theme.colors.inkPrimary}
          />
        </TouchableOpacity>
        <AtelierText
          variant="title1"
          style={styles.headerTitle}
        >
          The Saturation Point
        </AtelierText>
        <TouchableOpacity
          style={styles.headerIconButton}
          onPress={() => navigation.navigate('CartTab')}
        >
          <View>
            <Ionicons
              name="cart-outline"
              size={24}
              color={theme.colors.inkPrimary}
            />
            <CartIconBadge />
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.searchSection}>
        <View style={styles.searchInputContainer}>
          <AtelierInput
            placeholder="Search pens, inks, paper..."
            value={searchInput}
            onChangeText={setSearchInput}
            style={styles.searchInputWrapper}
          />
        </View>
        <TouchableOpacity
          style={[
            styles.filterIconButton,
            hasActivePriceFilter && styles.filterIconButtonActive,
          ]}
          onPress={() => setFilterModalVisible(true)}
        >
          <Ionicons
            name="options-outline"
            size={22}
            color={hasActivePriceFilter ? '#FFFFFF' : theme.colors.inkPrimary}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.categoryScrollWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryChip,
                  isSelected && styles.categoryChipSelected,
                ]}
                onPress={() => handleCategorySelect(cat)}
              >
                <AtelierText
                  variant="caption"
                  color={isSelected ? '#FFFFFF' : theme.colors.inkSecondary}
                  style={styles.chipText}
                >
                  {cat}
                </AtelierText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {error && (
        <AtelierErrorBanner
          message={error}
          onRetry={loadData}
        />
      )}

      {loading && items.length === 0 ? (
        <View style={styles.skeletonContainer}>
          {[1, 2, 3, 4].map((n) => (
            <View
              key={n}
              style={styles.skeletonCard}
            >
              <AtelierSkeleton
                height={160}
                borderRadius={theme.radii.sm}
              />
              <View style={styles.skeletonTextWrapper}>
                <AtelierSkeleton
                  height={14}
                  width="40%"
                  style={{ marginBottom: 6 }}
                />
                <AtelierSkeleton
                  height={18}
                  width="85%"
                  style={{ marginBottom: 8 }}
                />
                <AtelierSkeleton
                  height={16}
                  width="30%"
                />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item._id}
          renderItem={renderProductItem}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.gold}
            />
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

      <Modal
        visible={filterModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <AtelierText variant="title1">Filter by Price</AtelierText>
              <TouchableOpacity
                onPress={() => setFilterModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons
                  name="close"
                  size={24}
                  color={theme.colors.inkPrimary}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.priceInputsRow}>
              <View style={styles.priceInputColumn}>
                <AtelierInput
                  label="Min Price (PHP)"
                  placeholder="0"
                  value={minPriceDraft}
                  onChangeText={setMinPriceDraft}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.priceInputColumn}>
                <AtelierInput
                  label="Max Price (PHP)"
                  placeholder="20000"
                  value={maxPriceDraft}
                  onChangeText={setMaxPriceDraft}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.modalActions}>
              <AtelierButton
                title="Reset"
                variant="outline"
                onPress={handleClearAllFilters}
                style={styles.modalActionBtn}
              />
              <AtelierButton
                title="Apply Filters"
                onPress={handleApplyPriceFilter}
                style={styles.modalActionBtn}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.canvas,
  },
  header: {
    paddingTop: theme.spacing.hero + 16,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.canvas,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerIconButton: {
    width: theme.touchTarget.minWidth,
    height: theme.touchTarget.minHeight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    textAlign: 'center',
    letterSpacing: 0.2,
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
    width: theme.touchTarget.minWidth,
    height: theme.touchTarget.minHeight,
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterIconButtonActive: {
    backgroundColor: theme.colors.inkPrimary,
    borderColor: theme.colors.inkPrimary,
  },
  categoryScrollWrapper: {
    paddingBottom: theme.spacing.md,
  },
  categoryScroll: {
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  categoryChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: theme.radii.xs,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryChipSelected: {
    backgroundColor: theme.colors.inkPrimary,
    borderColor: theme.colors.inkPrimary,
  },
  chipText: {
    letterSpacing: 0.5,
  },
  listContent: {
    paddingHorizontal: theme.spacing.sm,
    paddingBottom: theme.spacing.hero,
  },
  gridItemContainer: {
    flex: 0.5,
    padding: theme.spacing.xs,
  },
  productCard: {
    padding: 0,
    backgroundColor: theme.colors.surface,
  },
  imageWrapper: {
    height: 160,
    width: '100%',
    backgroundColor: theme.colors.surfaceSubtle,
  },
  productImage: {
    width: '100%',
    height: '100%',
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
  priceText: {
    fontWeight: '700',
  },
  quickAddButton: {
    width: 36,
    height: 36,
    borderRadius: theme.radii.xs,
    backgroundColor: theme.colors.inkPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickAddDisabled: {
    backgroundColor: theme.colors.borderMedium,
  },
  skeletonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: theme.spacing.sm,
  },
  skeletonCard: {
    width: '50%',
    padding: theme.spacing.xs,
  },
  skeletonTextWrapper: {
    padding: theme.spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(28, 25, 23, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.canvas,
    borderTopLeftRadius: theme.radii.md,
    borderTopRightRadius: theme.radii.md,
    padding: theme.spacing.xl,
    paddingBottom: theme.spacing.hero,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  modalCloseButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
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
    marginTop: theme.spacing.sm,
  },
  modalActionBtn: {
    flex: 1,
  },
});

export default ProductListScreen;
