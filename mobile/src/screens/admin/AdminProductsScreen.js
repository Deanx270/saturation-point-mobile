import React, { useEffect, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Image,
  Alert,
  RefreshControl,
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

export const AdminProductsScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { items, loading, error } = useSelector((state) => state.products);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    dispatch(fetchProducts({}));
  }, [dispatch]);

  const onRefresh = async () => {
    setRefreshing(true);
    await dispatch(fetchProducts({}));
    setRefreshing(false);
  };

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
      <AtelierCard style={styles.card}>
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
        leftType="drawer"
        navigation={navigation}
        rightIcon="add-outline"
        rightIconColor={theme.colors.gold}
        rightIconSize={28}
        rightAccessibilityLabel="Add Product"
        onRightPress={() =>
          navigation.navigate('AdminProductForm', { isEditing: false })
        }
      />

      {error ? (
        <AtelierErrorBanner
          message={error}
          onRetry={() => dispatch(fetchProducts({}))}
          style={styles.errorBanner}
        />
      ) : null}

      {loading && items.length === 0 ? (
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
          data={items}
          keyExtractor={(item) => item._id}
          renderItem={renderProductItem}
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
