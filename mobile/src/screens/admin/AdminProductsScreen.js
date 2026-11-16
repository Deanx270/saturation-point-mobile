import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Image,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import AtelierText from '../../components/common/AtelierText';
import AtelierCard from '../../components/common/AtelierCard';
import AtelierBadge from '../../components/common/AtelierBadge';
import AtelierPressable from '../../components/common/AtelierPressable';
import AtelierEmptyState from '../../components/common/AtelierEmptyState';
import AtelierErrorBanner from '../../components/common/AtelierErrorBanner';
import AtelierSkeleton from '../../components/common/AtelierSkeleton';
import AtelierHeader from '../../components/common/AtelierHeader';
import { fetchProducts, deleteProduct } from '../../redux/productsSlice';
import { formatPrice, isValidRemoteOrLocalUri } from '../../utils/formatters';

const ADMIN_PAGE_LIMIT = 8;

export const AdminProductsScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const {
    adminItems,
    adminPage,
    adminTotal,
    adminHasMore,
    adminLoading,
    adminLoadingMore,
    adminError,
  } = useSelector((state) => state.products);
  const [refreshing, setRefreshing] = useState(false);
  const canGoBack = navigation.canGoBack();

  const loadPage = useCallback(
    (targetPage = 1) => {
      return dispatch(
        fetchProducts({
          target: 'admin',
          page: targetPage,
          limit: ADMIN_PAGE_LIMIT,
        })
      );
    },
    [dispatch]
  );

  useEffect(() => {
    loadPage(1);
  }, [loadPage]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPage(1);
    setRefreshing(false);
  };

  const handleLoadMore = useCallback(() => {
    if (!adminHasMore || adminLoading || adminLoadingMore) {
      return;
    }
    loadPage(adminPage + 1);
  }, [adminHasMore, adminLoading, adminLoadingMore, loadPage, adminPage]);

  const handleDelete = (productId, name) => {
    Alert.alert(
      'Delete Product',
      `Delete "${name}" from the catalog?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => dispatch(deleteProduct(productId)),
        },
      ]
    );
  };

  const renderProductItem = ({ item }) => {
    const firstImage = item.images?.[0];
    const hasValidImage = isValidRemoteOrLocalUri(firstImage);

    return (
      <AtelierCard
        style={styles.card}
        onPress={() =>
          navigation.navigate('AdminProductForm', {
            product: item,
            isEditing: true,
          })
        }
      >
        <View style={styles.cardRow}>
          {hasValidImage ? (
            <Image
              source={{ uri: firstImage }}
              style={styles.thumbnail}
            />
          ) : (
            <View style={[styles.thumbnail, styles.placeholderThumb]}>
              <Ionicons
                name="image-outline"
                size={24}
                color={theme.colors.inkMuted}
              />
            </View>
          )}
          <View style={styles.info}>
            <View style={styles.headerRow}>
              <AtelierText
                variant="caption"
                color={theme.colors.goldText}
                numberOfLines={1}
                style={styles.brandText}
              >
                {item.brand}
              </AtelierText>
              <AtelierBadge
                label={`${item.stock} IN STOCK`}
                status={item.stock > 0 ? 'success' : 'cancelled'}
              />
            </View>

            <AtelierText
              variant="title2"
              numberOfLines={1}
              style={styles.name}
            >
              {item.name}
            </AtelierText>

            <AtelierText
              variant="title2"
              color={theme.colors.inkPrimary}
              style={styles.price}
            >
              {formatPrice(item.price)}
            </AtelierText>

            <View style={styles.actionsRow}>
              <AtelierPressable
                tone="subtle"
                hitSlop={8}
                style={styles.editButton}
                onPress={() =>
                  navigation.navigate('AdminProductForm', {
                    product: item,
                    isEditing: true,
                  })
                }
              >
                <Ionicons
                  name="create-outline"
                  size={16}
                  color={theme.colors.inkPrimary}
                />
                <AtelierText
                  variant="caption"
                  color={theme.colors.inkPrimary}
                  style={styles.actionLabel}
                >
                  EDIT
                </AtelierText>
              </AtelierPressable>

              <AtelierPressable
                tone="subtle"
                hitSlop={8}
                style={styles.deleteButton}
                onPress={() => handleDelete(item._id, item.name)}
              >
                <Ionicons
                  name="trash-outline"
                  size={16}
                  color={theme.colors.error}
                />
                <AtelierText
                  variant="caption"
                  color={theme.colors.error}
                  style={styles.actionLabel}
                >
                  DELETE
                </AtelierText>
              </AtelierPressable>
            </View>
          </View>
        </View>
      </AtelierCard>
    );
  };

  return (
    <View style={styles.container}>
      <AtelierHeader
        title="Manage Products"
        leftType={canGoBack ? 'back' : 'drawer'}
        navigation={navigation}
        rightIcon="add-outline"
        rightIconColor={theme.colors.gold}
        rightIconSize={28}
        rightAccessibilityLabel="Add Product"
        onRightPress={() =>
          navigation.navigate('AdminProductForm', { isEditing: false })
        }
      />

      {adminError ? (
        <AtelierErrorBanner
          message={adminError}
          onRetry={() => loadPage(1)}
          style={styles.errorBanner}
        />
      ) : null}

      {adminLoading && adminItems.length === 0 ? (
        <View style={styles.skeletonPadding}>
          {[1, 2, 3].map((n) => (
            <AtelierSkeleton
              key={n}
              height={110}
              borderRadius={theme.radii.md}
              style={{ marginBottom: 12 }}
            />
          ))}
        </View>
      ) : (
        <FlatList
          data={adminItems}
          keyExtractor={(item) => item._id}
          renderItem={renderProductItem}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.gold}
            />
          }
          ListFooterComponent={
            adminItems.length > 0 ? (
              <View style={styles.listFooter}>
                {adminLoadingMore ? (
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
                    {adminHasMore
                      ? `Showing ${adminItems.length} of ${adminTotal} products`
                      : `All ${adminTotal || adminItems.length} products shown`}
                  </AtelierText>
                )}
              </View>
            ) : null
          }
          ListEmptyComponent={
            !adminError ? (
              <AtelierEmptyState
                iconName="cube-outline"
                title="No Products Found"
                description="Add a product to get started."
                actionTitle="Add Product"
                onActionPress={() =>
                  navigation.navigate('AdminProductForm', { isEditing: false })
                }
              />
            ) : null
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.canvas,
  },
  errorBanner: {
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
  },
  skeletonPadding: {
    padding: theme.spacing.lg,
  },
  listContent: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.hero,
  },
  card: {
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumbnail: {
    width: 90,
    height: 90,
    borderRadius: theme.radii.xs,
    backgroundColor: theme.colors.surfaceSubtle,
  },
  placeholderThumb: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    marginLeft: theme.spacing.md,
    justifyContent: 'space-between',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  brandText: {
    flexShrink: 1,
  },
  listFooter: {
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
  },
  name: {
    fontSize: 16,
    marginTop: 2,
  },
  price: {
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.lg,
    marginTop: theme.spacing.sm,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: theme.radii.xs,
    overflow: 'hidden',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: theme.radii.xs,
    overflow: 'hidden',
  },
  actionLabel: {
    marginLeft: 4,
    letterSpacing: 0.8,
  },
});

export default AdminProductsScreen;
