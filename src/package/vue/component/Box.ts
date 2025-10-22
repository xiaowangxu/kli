import { defineComponent, h, PropType, provide, inject, ref, Ref, watch, onMounted, onUnmounted } from 'vue';
import { Color } from '../../util/color.js';
import { BorderType } from '../../style/border_style.js';
import { BoxStyle } from '../../style/box_style.js';
import { Overflow, TextContainer } from '../../node/container.js';
import { Node } from '../../node/node.js';

// Using inject key to access parent node
const parentNodeKey = 'parentNode';

export default defineComponent({
  name: 'Box',
  props: {
    // BorderStyle properties
    borderColor: {
      type: Object as PropType<Color>,
      default: undefined,
    },
    borderType: {
      type: String as PropType<BorderType>,
      default: undefined,
    },
    
    // BoxStyle properties
    bgColor: {
      type: Object as PropType<Color>,
      default: undefined,
    },
    
    // Overflow property
    overflow: {
      type: String as PropType<keyof typeof Overflow>,
      default: 'Visible',
    },
    
    // Layout properties from Yoga
    flexDirection: {
      type: String as PropType<'row' | 'column'>,
      default: 'column',
    },
    alignItems: {
      type: String as PropType<'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline'>,
      default: 'stretch',
    },
    justifyContent: {
      type: String as PropType<'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly'>,
      default: 'flex-start',
    },
    flexGrow: {
      type: Number,
      default: 0,
    },
    flexShrink: {
      type: Number,
      default: 1,
    },
    flexBasis: {
      type: [Number, String],
      default: 'auto',
    },
    gap: {
      type: Number,
      default: 0,
    },
    width: {
      type: [Number, String],
      default: 'auto',
    },
    height: {
      type: [Number, String],
      default: 'auto',
    },
    minWidth: {
      type: [Number, String],
      default: 'auto',
    },
    minHeight: {
      type: [Number, String],
      default: 'auto',
    },
    maxWidth: {
      type: [Number, String],
      default: 'none',
    },
    maxHeight: {
      type: [Number, String],
      default: 'none',
    },
    padding: {
      type: Number,
      default: 0,
    },
    margin: {
      type: Number,
      default: 0,
    },
    position: {
      type: String as PropType<'relative' | 'absolute'>,
      default: 'relative',
    },
    top: {
      type: [Number, String],
      default: 'auto',
    },
    bottom: {
      type: [Number, String],
      default: 'auto',
    },
    left: {
      type: [Number, String],
      default: 'auto',
    },
    right: {
      type: [Number, String],
      default: 'auto',
    },
  },
  setup(props, { slots }) {
    // Reference to the parent node (from parent component)
    const parentNode = inject<Ref<Node | undefined>>(parentNodeKey, ref(undefined));
    
    // This would be the container instance in a real implementation
    // For Vue rendering, we're creating a visual representation only
    const containerRef = ref<HTMLElement | null>(null);

    // Style computation based on props
    const computedStyle = (): Partial<CSSStyleDeclaration> => {
      const style: Partial<CSSStyleDeclaration> = {
        display: 'flex',
        flexDirection: props.flexDirection,
        alignItems: props.alignItems,
        justifyContent: props.justifyContent,
        flexGrow: props.flexGrow.toString(),
        flexShrink: props.flexShrink.toString(),
        flexBasis: typeof props.flexBasis === 'number' ? `${props.flexBasis}px` : props.flexBasis,
        gap: `${props.gap}px`,
        width: typeof props.width === 'number' ? `${props.width}px` : props.width,
        height: typeof props.height === 'number' ? `${props.height}px` : props.height,
        minWidth: typeof props.minWidth === 'number' ? `${props.minWidth}px` : props.minWidth,
        minHeight: typeof props.minHeight === 'number' ? `${props.minHeight}px` : props.minHeight,
        maxWidth: typeof props.maxWidth === 'number' ? `${props.maxWidth}px` : props.maxWidth,
        maxHeight: typeof props.maxHeight === 'number' ? `${props.maxHeight}px` : props.maxHeight,
        padding: `${props.padding}px`,
        margin: `${props.margin}px`,
        position: props.position,
        top: typeof props.top === 'number' ? `${props.top}px` : props.top,
        bottom: typeof props.bottom === 'number' ? `${props.bottom}px` : props.bottom,
        left: typeof props.left === 'number' ? `${props.left}px` : props.left,
        right: typeof props.right === 'number' ? `${props.right}px` : props.right,
      };

      // Add background color if specified
      if (props.bgColor) {
        style.backgroundColor = `rgb(${props.bgColor.r}, ${props.bgColor.g}, ${props.bgColor.b})`;
      }

      // Handle border styles
      if (props.borderType && props.borderColor) {
        const borderWidth = 1; // Simplified for now
        style.border = `${borderWidth}px solid rgb(${props.borderColor.r}, ${props.borderColor.g}, ${props.borderColor.b})`;
      }

      return style;
    };

    // Provide the container instance to child components
    const containerInstance = ref(null);
    provide(parentNodeKey, containerInstance);

    return { 
      containerRef,
      computedStyle,
    };
  },
  render() {
    // Build the container element with styles
    return h(
      'div',
      {
        ref: 'containerRef',
        class: 'kli-container',
        style: this.computedStyle(),
      },
      this.$slots.default?.()
    );
  }
});