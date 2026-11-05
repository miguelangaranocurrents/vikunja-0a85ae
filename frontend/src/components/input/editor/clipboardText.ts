import type {Fragment, Node as ProseMirrorNode, Slice} from '@tiptap/pm/model'

// Serializes copied editor content to plain text the way a user would type it.

const LIST_TYPES = ['bulletList', 'orderedList', 'taskList']

function inlineText(content: Fragment): string {
	let text = ''
	content.forEach(child => {
		if (child.isText) {
			text += child.text ?? ''
		} else if (child.type.name === 'hardBreak') {
			text += '\n'
		} else if (child.isLeaf && child.type.spec.leafText) {
			text += child.type.spec.leafText(child)
		} else if (child.isInline) {
			text += child.textContent
		} else {
			text += blocksToLines(child.content, '').join('\n')
		}
	})
	return text
}

function listToLines(list: ProseMirrorNode, indent: string): string[] {
	const lines: string[] = []
	const start = typeof list.attrs.start === 'number' ? list.attrs.start : 1
	list.forEach((item, _offset, index) => {
		let marker: string
		if (list.type.name === 'orderedList') {
			marker = `${start + index}. `
		} else if (list.type.name === 'taskList') {
			marker = item.attrs.checked ? '- [x] ' : '- [ ] '
		} else {
			marker = '- '
		}
		const childIndent = indent + ' '.repeat(marker.length)
		const itemLines = blocksToLines(item.content, childIndent)
		if (itemLines.length === 0) {
			lines.push(indent + marker.trimEnd())
			return
		}
		// the first line of the item gets the marker instead of the continuation indent
		lines.push(indent + marker + itemLines[0].slice(childIndent.length))
		lines.push(...itemLines.slice(1))
	})
	return lines
}

function blocksToLines(content: Fragment, indent: string): string[] {
	const lines: string[] = []
	content.forEach(node => {
		if (LIST_TYPES.includes(node.type.name)) {
			lines.push(...listToLines(node, indent))
			return
		}
		if (node.isTextblock) {
			inlineText(node.content).split('\n').forEach(line => lines.push(indent + line))
			return
		}
		if (node.isInline) {
			lines.push(indent + (node.isText ? node.text ?? '' : node.textContent))
			return
		}
		lines.push(...blocksToLines(node.content, indent))
	})
	return lines
}

/**
 * Plain text representation of a copied slice which keeps the structure of lists
 * (bullets, numbers and checkboxes) instead of flattening them into bare lines.
 */
export function serializeSliceAsText(slice: Slice): string {
	// a selection inside a single textblock yields bare inline content
	if (slice.content.firstChild?.isInline) {
		return inlineText(slice.content)
	}
	return blocksToLines(slice.content, '').join('\n')
}
