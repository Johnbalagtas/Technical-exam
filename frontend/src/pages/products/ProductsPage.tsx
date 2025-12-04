import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { productsApi } from '../../services/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { DataTable } from '../../components/DataTable';
import { createProductColumns } from '../../components/products/ProductColumns';
import ProductForm from '../../components/products/ProductForm';
import type { Product, CreateProductDto } from '../../types';

export default function ProductsPage() {
  const { logout } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadProducts = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await productsApi.getAll({ page, limit });
      setProducts(response.data);
      setTotal(response.total);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setIsLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    loadProducts();
  }, [page, loadProducts]);

  const handleCreateProduct = async (data: CreateProductDto) => {
    try {
      setIsSubmitting(true);
      await productsApi.create(data);
      setIsDialogOpen(false);
      loadProducts();
    } catch (error) {
      console.error('Failed to create product:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateProduct = async (data: CreateProductDto) => {
    if (!selectedProduct) return;

    try {
      setIsSubmitting(true);
      await productsApi.update(selectedProduct.id, data);
      setIsDialogOpen(false);
      setSelectedProduct(null);
      loadProducts();
    } catch (error) {
      console.error('Failed to update product:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;

    try {
      await productsApi.delete(productToDelete.id);
      setIsDeleteDialogOpen(false);
      setProductToDelete(null);
      loadProducts();
    } catch (error) {
      console.error('Failed to delete product:', error);
    }
  };

  const openEditDialog = (product: Product) => {
    setSelectedProduct(product);
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setSelectedProduct(null);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setSelectedProduct(null);
  };

  const openDeleteDialog = (product: Product) => {
    setProductToDelete(product);
    setIsDeleteDialogOpen(true);
  };

  const columns = useMemo(
    () => createProductColumns(openEditDialog, openDeleteDialog),
    []
  );

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="bg-linear-to-br from-gray-50 to-gray-100 min-h-screen">
      <header className="bg-white shadow-sm border-b">
        <div className="flex justify-between items-center mx-auto px-4 py-4 max-w-7xl container">
          <div>
            <h1 className="font-bold text-gray-900 text-2xl">Products Management</h1>
            <p className="mt-1 text-gray-500 text-sm">Manage your product inventory</p>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={logout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto px-4 py-8 max-w-7xl container">
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row justify-between items-center bg-white border-b">
            <div>
              <CardTitle className="text-xl">Products</CardTitle>
              <p className="mt-1 text-gray-500 text-sm">A list of all products in your inventory</p>
            </div>
            <Button onClick={openCreateDialog} className="bg-blue-600 hover:bg-blue-700">
              + Add Product
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable
              columns={columns}
              data={products}
              pageCount={totalPages}
              pageIndex={page - 1}
              pageSize={limit}
              total={total}
              onPageChange={setPage}
              isLoading={isLoading}
              manualPagination={true}
            />
          </CardContent>
        </Card>
      </main>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">{selectedProduct ? 'Edit Product' : 'Create New Product'}</DialogTitle>
          </DialogHeader>
          <ProductForm
            product={selectedProduct || undefined}
            onSubmit={selectedProduct ? handleUpdateProduct : handleCreateProduct}
            onCancel={closeDialog}
            isLoading={isSubmitting}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <span className="font-semibold">"{productToDelete?.name}"</span>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setProductToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProduct} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
