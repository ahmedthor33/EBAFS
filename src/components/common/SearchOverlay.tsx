import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, ArrowRight } from 'lucide-react';
import { productService } from '../../services/productService';
import { Product } from '../../types';
import { formatPKR } from '../../lib/supabase';
import './SearchOverlay.css';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SearchOverlay: React.FC<SearchOverlayProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const { products } = await productService.getProducts({ search: query, limit: 6 });
        setResults(products);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelectProduct = (slug: string) => {
    onClose();
    navigate(`/product/${slug}`);
  };

  const handleFullSearch = (searchTerm: string) => {
    onClose();
    navigate(`/shop?search=${encodeURIComponent(searchTerm)}`);
  };

  if (!isOpen) return null;

  return (
    <div className="search-overlay-backdrop">
      <div className="search-overlay-content">
        <div className="container search-container">
          <div className="search-top-bar">
            <span className="search-heading">CURATED SEARCH</span>
            <button className="search-close-btn" onClick={onClose} aria-label="Close search">
              <X size={24} />
            </button>
          </div>

          <div className="search-input-wrapper">
            <Search className="search-input-icon" size={24} />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search designer unstitched, pure wool shawls, lawn, silk..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && query.trim()) {
                  handleFullSearch(query);
                }
              }}
              className="search-input"
            />
            {query && (
              <button className="search-clear-btn" onClick={() => setQuery('')}>
                <X size={18} />
              </button>
            )}
          </div>

          {/* Quick Suggestions / Popular Searches */}
          {!query && (
            <div className="popular-searches">
              <span className="popular-label">POPULAR COLLECTIONS</span>
              <div className="popular-tags">
                {['Men Unstitched', 'Luxury Lawn', 'Wool Shawls', 'Chiffon Formals', 'Hussain Rehar', 'Maria-B', 'Baroque', 'Egyptian Cotton'].map((tag) => (
                  <button
                    key={tag}
                    className="popular-tag-btn"
                    onClick={() => {
                      setQuery(tag);
                    }}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Search Results Preview */}
          {query && (
            <div className="search-results-section">
              <div className="results-header">
                <span>
                  {isSearching ? 'Searching...' : `Found ${results.length} results for "${query}"`}
                </span>
                {results.length > 0 && (
                  <button
                    className="view-all-results-btn"
                    onClick={() => handleFullSearch(query)}
                  >
                    View All Results <ArrowRight size={14} />
                  </button>
                )}
              </div>

              {results.length > 0 ? (
                <div className="search-results-grid">
                  {results.map((product) => (
                    <div
                      key={product.id}
                      className="search-result-card"
                      onClick={() => handleSelectProduct(product.slug)}
                    >
                      <div className="result-img-wrap">
                        <img
                          src={product.images?.[0]?.url || '/assets/logo/eba-logo.png'}
                          alt={product.name}
                        />
                      </div>
                      <div className="result-details">
                        <span className="result-brand">{product.brand?.name}</span>
                        <h4 className="result-title">{product.name}</h4>
                        <div className="result-price-row">
                          <span className="result-price">
                            {formatPKR(product.sale_price ?? product.price)}
                          </span>
                          {product.sale_price && (
                            <span className="result-orig-price">{formatPKR(product.price)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : !isSearching ? (
                <div className="no-search-results">
                  <p>No products found matching your search. Try searching for "Lawn", "Shawl", or a designer name.</p>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
