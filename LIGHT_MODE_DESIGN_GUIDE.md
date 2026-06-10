# Light Mode Design Guide - Creative Backgrounds

## Overview
This guide shows how to use the new CSS utilities to create engaging, non-boring light mode designs across the PricePulse application.

---

## Available Background Utilities

### 1. Mesh Gradient (`mesh-gradient`)
Multi-point radial gradient creating a subtle mesh effect.

**Best for:** Full-page backgrounds, hero sections, large containers

```jsx
<section className="mesh-gradient min-h-screen p-8">
  <div className="container">
    {/* Your content */}
  </div>
</section>
```

**Visual:** Soft gradient blobs at all four corners creating depth

---

### 2. Diagonal Lines (`diagonal-lines`)
Repeating diagonal stripe pattern.

**Best for:** Section dividers, card backgrounds, feature boxes

```jsx
<Card className="diagonal-lines">
  <CardContent>
    <h3>Feature Title</h3>
    <p>Description</p>
  </CardContent>
</Card>
```

**Visual:** Subtle 45-degree lines creating texture

---

### 3. Wavy Pattern (`wavy-pattern`)
Organic radial wave pattern.

**Best for:** Testimonial sections, CTA backgrounds, accent areas

```jsx
<div className="wavy-pattern rounded-lg p-6">
  <blockquote>Customer testimonial...</blockquote>
</div>
```

**Visual:** Soft concentric circles creating natural feel

---

### 4. Glow Card (`glow-card`)
Card with animated glow effect on hover.

**Best for:** Product cards, feature cards, clickable items

```jsx
<Card className="glow-card cursor-pointer">
  <CardContent>
    {/* Hovering creates gradient glow around edges */}
  </CardContent>
</Card>
```

**Visual:** Gradient border glow appears on hover with blur

---

### 5. Brand Gradient Background (`bg-gradient-brand`)
Theme-aware gradient background.

**Best for:** Hero sections, highlighted areas, CTAs

```jsx
<section className="bg-gradient-brand py-24">
  <h1 className="gradient-text">Your Heading</h1>
</section>
```

**Visual:** Diagonal gradient using theme colors (blue → purple → green)

---

### 6. Card Pattern (`card-pattern`)
Corner gradient accents on cards.

**Best for:** Dashboard cards, stats cards, info boxes

```jsx
<Card className="card-pattern">
  <CardHeader>
    <CardTitle>Monthly Stats</CardTitle>
  </CardHeader>
  <CardContent>
    {/* Stats content */}
  </CardContent>
</Card>
```

**Visual:** Gradient accents at top-left and bottom-right corners

---

### 7. Floating Shapes (`floating-shapes`)
Animated floating blob shapes.

**Best for:** Large sections, landing page sections, backgrounds

```jsx
<section className="floating-shapes relative py-24">
  <div className="container relative z-10">
    {/* Content appears above floating shapes */}
  </div>
</section>
```

**Visual:** Circular blobs floating around with 20s animation

---

### 8. Spotlight (`spotlight`)
Mouse-tracking spotlight effect (requires JS enhancement).

**Best for:** Interactive cards, featured items, gallery

```jsx
<Card className="spotlight">
  <CardContent>
    {/* Radial glow follows mouse cursor */}
  </CardContent>
</Card>
```

**Visual:** Circular gradient spotlight on hover

---

### 9. Dot Pattern (`dot-pattern`)
Grid of dots creating texture.

**Best for:** Subtle backgrounds, section fills, overlay effects

```jsx
<div className="dot-pattern bg-card/50 rounded-lg p-8">
  <h2>Section Title</h2>
</div>
```

**Visual:** Evenly spaced dots creating subtle texture

---

### 10. Grid Background (`grid-bg`)
Line grid with radial mask.

**Best for:** Hero sections, landing backgrounds, tech aesthetic

```jsx
<section className="relative">
  <div className="absolute inset-0 grid-bg" />
  <div className="relative z-10">
    {/* Content */}
  </div>
</section>
```

**Visual:** Grid lines fading out radially from center

---

## Combination Patterns

### Pattern 1: Hero Section
```jsx
<section className="relative overflow-hidden py-24">
  <div className="absolute inset-0 grid-bg" />
  <div className="absolute inset-0 bg-gradient-brand opacity-40" />
  <div className="container relative z-10">
    <h1 className="gradient-text">Welcome to PricePulse</h1>
  </div>
</section>
```

### Pattern 2: Feature Cards
```jsx
<div className="grid grid-cols-3 gap-6">
  {features.map((feature, i) => (
    <Card key={i} className="glow-card card-pattern hover-lift">
      <CardContent>
        <h3>{feature.title}</h3>
        <p>{feature.description}</p>
      </CardContent>
    </Card>
  ))}
</div>
```

### Pattern 3: Dashboard Stats
```jsx
<Card className="mesh-gradient border-gradient overflow-hidden">
  <div className="dot-pattern absolute inset-0 opacity-30" />
  <CardContent className="relative z-10">
    <StatCard label="Revenue" value="$24,532" />
  </CardContent>
</Card>
```

### Pattern 4: Testimonials Section
```jsx
<section className="floating-shapes py-24">
  <div className="container">
    <div className="wavy-pattern rounded-2xl p-12">
      <blockquote className="text-2xl italic">
        "PricePulse saved me hundreds!"
      </blockquote>
    </div>
  </div>
</section>
```

---

## Dashboard Page Enhancements

### Overview Page
```jsx
// Add to main container
<div className="space-y-6 sm:space-y-8">
  {/* Header stays the same */}
  
  {/* Stats cards with pattern */}
  <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
    {stats.map((stat) => (
      <Card className="card-pattern glow-card">
        <StatCard {...stat} />
      </Card>
    ))}
  </div>
  
  {/* Charts section with mesh background */}
  <div className="mesh-gradient rounded-xl p-6">
    <Card className="border-0 shadow-none bg-transparent">
      <CardContent>
        <OverviewTrendChart />
      </CardContent>
    </Card>
  </div>
</div>
```

### Products Page
```jsx
// Product grid container
<div className="relative">
  <div className="absolute inset-0 dot-pattern opacity-20 pointer-events-none" />
  <ul className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4 relative z-10">
    {products.map((product) => (
      <li key={product.id}>
        <Card className="glow-card hover-lift">
          <ProductCard {...product} />
        </Card>
      </li>
    ))}
  </ul>
</div>
```

### Analytics Page
```jsx
// Add floating shapes to large chart containers
<Card className="floating-shapes">
  <CardHeader>
    <CardTitle>Price Trends</CardTitle>
  </CardHeader>
  <CardContent className="relative z-10">
    <PriceTrendChart />
  </CardContent>
</Card>
```

### Collections Page
```jsx
// Collection cards with patterns
{collections.map((collection) => (
  <Card 
    key={collection.id}
    className="diagonal-lines hover-scale cursor-pointer"
    style={{
      borderLeftWidth: '4px',
      borderLeftColor: collection.color,
    }}
  >
    <CardContent>
      <h3>{collection.name}</h3>
      <p>{collection.productCount} products</p>
    </CardContent>
  </Card>
))}
```

---

## Landing Page Enhancements

### Hero Section
```jsx
<section className="relative overflow-hidden">
  {/* Multi-layer background */}
  <div className="absolute inset-0 grid-bg" />
  <div className="absolute inset-0 bg-gradient-brand pointer-events-none" />
  <div className="absolute inset-0 floating-shapes" />
  
  {/* Content */}
  <div className="container relative z-10 pt-20 pb-24">
    <h1 className="gradient-text text-6xl font-bold">
      Track every price
    </h1>
  </div>
</section>
```

### Features Section
```jsx
<section className="py-24 mesh-gradient">
  <div className="container">
    <div className="grid gap-6 md:grid-cols-3">
      {features.map((feature) => (
        <Card className="glow-card spotlight">
          <CardContent>
            <div className="card-pattern absolute inset-0 opacity-40" />
            <div className="relative z-10">
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
</section>
```

### CTA Section
```jsx
<section className="py-24 relative overflow-hidden">
  <div className="absolute inset-0 diagonal-lines opacity-30" />
  <div className="absolute inset-0 bg-gradient-brand" />
  
  <div className="container relative z-10 text-center">
    <h2 className="text-4xl font-bold mb-6">
      Start Tracking Today
    </h2>
    <Button size="lg" variant="gradient" className="shimmer">
      Get Started Free
    </Button>
  </div>
</section>
```

---

## Best Practices

### 1. Layer Backgrounds
Don't use just one pattern. Layer multiple with different opacities:
```jsx
<div className="relative">
  <div className="absolute inset-0 mesh-gradient" />
  <div className="absolute inset-0 dot-pattern opacity-20" />
  <div className="relative z-10">{/* Content */}</div>
</div>
```

### 2. Respect Dark Mode
All utilities automatically adapt to dark mode via CSS variables. No extra work needed.

### 3. Performance
- CSS patterns (no images)
- GPU-accelerated animations
- Respects `prefers-reduced-motion`

### 4. Don't Overdo It
- Use 2-3 patterns max per page
- Keep opacity low (10-20%)
- Primary focus should be on content

### 5. Accessibility
- Ensure sufficient contrast
- Don't rely on color alone
- Test with screen readers

---

## Animation Combinations

### Hover Effects + Backgrounds
```jsx
<Card className="glow-card hover-lift hover-scale">
  <div className="card-pattern absolute inset-0" />
  <CardContent className="relative z-10">
    {/* Content */}
  </CardContent>
</Card>
```

### Shimmer + Gradient
```jsx
<Button className="shimmer gradient-border">
  Click Me
</Button>
```

### Floating + Mesh
```jsx
<section className="floating-shapes mesh-gradient py-24">
  <div className="container">
    {/* Content */}
  </div>
</section>
```

---

## Responsive Considerations

All patterns are responsive by default. For mobile optimizations:

```jsx
// Reduce complexity on mobile
<div className="md:mesh-gradient md:floating-shapes">
  {/* Simpler background on mobile, full effects on desktop */}
</div>

// Scale down animations
<Card className="glow-card md:hover-lift">
  {/* Lift only on desktop */}
</Card>
```

---

## Color Customization

Patterns use CSS variables and adapt to theme:

```css
/* In your component or page */
.custom-pattern {
  --gradient-from: 234 89% 74%;  /* Blue */
  --gradient-via: 280 90% 80%;   /* Purple */
  --gradient-to: 142 76% 56%;    /* Green */
}
```

---

## Testing Checklist

- [ ] View in light mode
- [ ] View in dark mode
- [ ] Check mobile responsiveness
- [ ] Test hover effects
- [ ] Verify animations are smooth
- [ ] Check contrast ratios
- [ ] Test with reduced motion preference
- [ ] Verify performance (no jank)

---

## Examples in Production

Check these pages for reference:
- Landing page: Hero, features, CTA sections
- Dashboard: Stats cards, chart containers
- Products: Product grid, filters
- Collections: Collection cards
- Analytics: Chart wrappers

---

## Quick Reference

| Utility | Use Case | Opacity Suggestion |
|---------|----------|-------------------|
| `mesh-gradient` | Large backgrounds | Full (built-in) |
| `diagonal-lines` | Card textures | 20-30% |
| `wavy-pattern` | Sections | 30-40% |
| `glow-card` | Interactive cards | Full (hover effect) |
| `bg-gradient-brand` | Hero sections | 40-60% |
| `card-pattern` | Dashboard cards | Full (built-in) |
| `floating-shapes` | Page sections | Full (built-in 8%) |
| `spotlight` | Featured items | Full (hover effect) |
| `dot-pattern` | Overlays | 15-25% |
| `grid-bg` | Tech sections | Full (masked) |

---

## Support

For questions or suggestions, refer to:
- `apps/web/src/styles/globals.css` - Source code
- `FIXES_2024_06_10.md` - Implementation details
- Design team for approval of specific patterns

**Happy designing! 🎨**
