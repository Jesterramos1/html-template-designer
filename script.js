class FormDesigner {
    constructor() {
        this.elements = [];
        this.selectedElement = null;
        this.selectedElements = [];
        this.nextId = 1;
        this.zoom = 1;
        this.showGrid = false;
        this.snapToGrid = false;
        this.gridSize = 10;
        this.isDragging = false;
        this.isResizing = false;
        this.dragOffset = { x: 0, y: 0 };
        this.currentResizeHandle = null;
        this.isResizingColumn = false;
        this.resizingColumnIndex = null;
        this.isMarqueeSelecting = false;
        this.marqueeStart = { x: 0, y: 0 };
        this.undoStack = [];
        this.redoStack = [];
        this.maxHistorySteps = 50; // Limit history size

        this.initializeElements();
        this.setupEventListeners();
        this.loadFromLocalStorage();

        setTimeout(() => {
            this.captureState('Initial State');
        }, 100);
    }

    initializeElements() {
        this.canvas = document.getElementById('designCanvas');
        this.propertiesContent = document.getElementById('propertiesContent');
        this.setupGrid();
        this.updateGridVisibility();
    }

    updateGridVisibility() {
        const grid = document.querySelector('.canvas-grid');
        const gridBtn = document.getElementById('toggleGrid');
        const snapBtn = document.getElementById('snapToGrid');

        // Update grid visibility
        if (this.showGrid) {
            grid.classList.remove('hidden');
            gridBtn.classList.add('active');
        } else {
            grid.classList.add('hidden');
            gridBtn.classList.remove('active');
        }

        // Update snap to grid button state
        snapBtn.classList.toggle('active', this.snapToGrid);
    }

    setupGrid() {
        const grid = document.querySelector('.canvas-grid');
        grid.style.backgroundSize = `${this.gridSize}px ${this.gridSize}px`;
    }

    setupEventListeners() {
        // Toolbox drag and drop
        document.querySelectorAll('.toolbox-item').forEach(item => {
            item.addEventListener('dragstart', this.handleToolboxDragStart.bind(this));
        });

        this.canvas.addEventListener('dragover', this.handleCanvasDragOver.bind(this));
        this.canvas.addEventListener('drop', this.handleCanvasDrop.bind(this));
        //this.canvas.addEventListener('click', this.handleCanvasClick.bind(this));
        this.canvas.addEventListener('mousedown', this.handleCanvasMouseDown.bind(this));

        // Header controls
        document.getElementById('saveBtn').addEventListener('click', this.saveTemplate.bind(this));
        document.getElementById('exportHtmlBtn').addEventListener('click', this.exportAsHTML.bind(this));
        document.getElementById('printBtn').addEventListener('click', this.printForm.bind(this));
        document.getElementById('importBtn').addEventListener('click', () => {
            document.getElementById('importFile').click();
        });
        document.getElementById('importFile').addEventListener('change', this.importTemplate.bind(this));
        document.getElementById('clearBtn').addEventListener('click', this.clearCanvas.bind(this));

        // Paper size
        document.getElementById('paperSize').addEventListener('change', this.handlePaperSizeChange.bind(this));
        document.getElementById('applyCustomSize').addEventListener('click', this.applyCustomSize.bind(this));

        // Canvas controls
        document.getElementById('zoomIn').addEventListener('click', () => this.adjustZoom(0.1));
        document.getElementById('zoomOut').addEventListener('click', () => this.adjustZoom(-0.1));
        document.getElementById('toggleGrid').addEventListener('click', this.toggleGrid.bind(this));
        document.getElementById('snapToGrid').addEventListener('click', this.toggleSnapToGrid.bind(this));

        // Keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyboard.bind(this));

        // Context menu
        document.addEventListener('click', () => this.hideContextMenu());

        // Export dropdown
        const exportDropdown = document.getElementById('exportDropdown');
        const dropdownMenu = exportDropdown.nextElementSibling;

        exportDropdown.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownMenu.classList.toggle('show');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            dropdownMenu.classList.remove('show');
        });

        // Export buttons
        document.getElementById('exportHtmlBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.exportAsHTML();
            dropdownMenu.classList.remove('show');
        });

        document.getElementById('exportJsonBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.exportAsJSON();
            dropdownMenu.classList.remove('show');
        });

        document.getElementById('printBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.printForm();
            dropdownMenu.classList.remove('show');
        });
    }

    handleToolboxDragStart(e) {
        const type = e.target.dataset.type;
        e.dataTransfer.setData('text/plain', type);
        e.dataTransfer.effectAllowed = 'copy';
    }

    handleCanvasDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    }

    handleCanvasDrop(e) {
        e.preventDefault();
        const type = e.dataTransfer.getData('text/plain');
        const rect = this.canvas.getBoundingClientRect();

        let x = (e.clientX - rect.left) / this.zoom;
        let y = (e.clientY - rect.top) / this.zoom;

        if (this.snapToGrid) {
            x = Math.round(x / this.gridSize) * this.gridSize;
            y = Math.round(y / this.gridSize) * this.gridSize;
        }

        this.addElement(type, x, y);
    }

    addElement(type, x, y) {
        this.captureState(`Add ${type}`);
        const id = `element-${this.nextId++}`;
        const element = {
            id,
            type,
            x,
            y,
            width: this.getDefaultWidth(type),
            height: this.getDefaultHeight(type),
            properties: this.getDefaultProperties(type)
        };

        // Ensure checkbox has reasonable dimensions even if 'auto'
        if (type === 'checkbox' && element.width === 'auto') {
            element.width = 120; // Reasonable default width
        }
        if (type === 'checkbox' && element.height === 'auto') {
            element.height = 24; // Reasonable default height
        }

        this.elements.push(element);
        this.renderElement(element);
        this.selectElement(element);
        this.saveToLocalStorage();
    }

    getDefaultWidth(type) {
        const defaults = {
            'text-field': 200,
            'rectangle': 150,
            'vline': 2,
            'hline': 200,
            'table': 300,
            'label': 120,
            'checkbox': 120,
            'signature': 200
        };
        return defaults[type] || 100;
    }

    getDefaultHeight(type) {
        const defaults = {
            'text-field': 25,
            'rectangle': 100,
            'vline': 100,
            'hline': 2,
            'table': 120,
            'label': 24,
            'checkbox': 24,
            'signature': 80
        };
        return defaults[type] || 30;
    }

    getDefaultProperties(type) {
        const baseProps = {
            label: '',
            fontSize: 14,
            color: '#000000',
            backgroundColor: 'transparent',
            borderColor: '#000000',
            borderWidth: 1,
            textAlign: 'left',
            fontWeight: 'normal',
            elementId: ''
        };

        const typeProps = {
            'text-field': {
                ...baseProps,
                text: 'Text Field',
                placeholder: '',
                fontSize: 9
            },
            'rectangle': {
                ...baseProps,
                label: '',
                fillColor: 'transparent',
                borderWidth: 2
            },
            'vline': {
                ...baseProps,
                label: '',
                color: '#000000',
                thickness: 2
            },
            'hline': {
                ...baseProps,
                label: '',
                color: '#000000',
                thickness: 2
            },
            'table': {
                ...baseProps,
                label: 'Table',
                rows: 2,
                columns: 3,
                headers: ['Header 1', 'Header 2', 'Header 3'],
                columnWidths: [33.33, 33.33, 33.34],
                fontSize: 12,
                rowHeight: 30,
                showHeader: true,
                showBorders: true,
                borderWidth: 1,
                borderColor: '#34495e'
            },
            'label': {
                ...baseProps,
                label: 'Text Label',
                text: 'Label Text',
                fontSize: 9
            },
            'checkbox': {
                ...baseProps,
                label: 'Checkbox',
                text: 'Check me',
                checkboxSize: 12,
                labelPosition: 'right',  // 'left' or 'right'
                fontSize: 10,
                labelGap: 8
            },
            'signature': {
                ...baseProps,
                label: 'Signature',
                text: 'Signature'
            }
        };

        return typeProps[type] || baseProps;
    }

    renderElement(elementData) {
        let elementDiv = document.getElementById(elementData.id);

        // For tables, always remove and re-create when structural changes occur
        if (elementData.type === 'table' && elementDiv) {
            // Check if we need to force re-render by comparing current content with expected
            const currentRows = elementDiv.querySelectorAll('.table-row').length;
            const expectedRows = elementData.properties.showHeader ?
                elementData.properties.rows :
                elementData.properties.rows + 1;

            if (currentRows !== expectedRows) {
                elementDiv.remove();
                elementDiv = null;
            }
        }

        if (!elementDiv) {
            elementDiv = document.createElement('div');
            elementDiv.id = elementData.id;
            elementDiv.className = `design-element ${elementData.type}-element`;
            this.canvas.appendChild(elementDiv);

            // Add resize handles for resizable elements
            if (this.isResizable(elementData.type)) {
                this.addResizeHandles(elementDiv);
            }

            // Make draggable
            this.makeDraggable(elementDiv);

            // Initial content render
            this.updateElementContent(elementDiv, elementData);
        }

        // Update position and size
        elementDiv.style.left = `${elementData.x}px`;
        elementDiv.style.top = `${elementData.y}px`;

        // For table, width is set explicitly
        if (elementData.type === 'table') {
            elementDiv.style.width = `${elementData.width}px`;
            elementDiv.style.height = 'auto'; // Auto height for tables
        } else {
            elementDiv.style.width = `${elementData.width}px`;
            elementDiv.style.height = `${elementData.height}px`;
        }

        // Only update content if not dragging/resizing
        if (!this.isDragging && !this.isResizing && !this.isResizingColumn) {
            this.updateElementContent(elementDiv, elementData);
        }

        // Apply styles
        this.applyElementStyles(elementDiv, elementData);
    }

    updateElementContent(elementDiv, elementData) {
        const { type, properties } = elementData;

        if (this.isDragging || this.isResizing || this.isResizingColumn) {
            return;
        }
        // Save existing resize handles before updating content
        const resizeHandles = Array.from(elementDiv.querySelectorAll('.resize-handle'));
        const columnResizeHandles = Array.from(elementDiv.querySelectorAll('.column-resize-handle'));

        switch (type) {
            case 'text-field':
                if (elementDiv.textContent !== (properties.text || 'Text Field')) {
                    elementDiv.innerHTML = `${properties.text || 'Text Field'}`;
                }
                break;

            case 'rectangle':
                elementDiv.innerHTML = '';
                break;

            case 'vline':
                elementDiv.innerHTML = '';
                elementDiv.style.borderLeft = `${properties.thickness}px solid ${properties.color}`;
                elementDiv.style.backgroundColor = 'transparent';
                break;

            case 'hline':
                elementDiv.innerHTML = '';
                elementDiv.style.borderTop = `${properties.thickness}px solid ${properties.color}`;
                elementDiv.style.backgroundColor = 'transparent';
                break;

            case 'table':
                const resizeHandles = Array.from(elementDiv.querySelectorAll('.resize-handle'));
                const columnResizeHandles = Array.from(elementDiv.querySelectorAll('.column-resize-handle'));

                this.renderTable(elementDiv, elementData);

                // Restore resize handles after updating content
                resizeHandles.forEach(handle => elementDiv.appendChild(handle));
                columnResizeHandles.forEach(handle => elementDiv.appendChild(handle));
                break;

            case 'label':
                if (elementDiv.textContent !== (properties.text || 'Label')) {
                    elementDiv.innerHTML = `${properties.text || 'Label'}`;
                }
                break;

            case 'checkbox':
                const checkboxSize = properties.checkboxSize || 16;
                const labelGap = properties.labelGap || 8;
                const labelPosition = properties.labelPosition || 'right';
                const checkfontSize = properties.fontSize || 14;

                if (labelPosition === 'right') {
                    elementDiv.innerHTML = `
                        <input type="checkbox" style="display: inline-block; vertical-align: middle; margin: 0 ${labelGap}px 0 0; width: ${checkboxSize}px; height: ${checkboxSize}px;">
                        <span class="checkbox-label" style="display: inline-block; vertical-align: middle; font-size: ${checkfontSize}pt; color: #2c3e50;">${properties.text || 'Checkbox'}</span>
                    `;
                } else {
                    elementDiv.innerHTML = `
                        <span class="checkbox-label" style="display: inline-block; vertical-align: middle; font-size: ${checkfontSize}pt; color: #2c3e50; margin: 0 ${labelGap}px 0 0;">${properties.text || 'Checkbox'}</span>
                        <input type="checkbox" style="display: inline-block; vertical-align: middle; margin: 0; width: ${checkboxSize}px; height: ${checkboxSize}px;">
                    `;
                }
                break;

            case 'signature':
                const paddingTop = Math.max(10, Math.floor(elementData.height / 3));
                elementDiv.innerHTML = `<div style="text-align: center; padding-top: ${paddingTop}px; font-style: italic;">${properties.text || 'Signature'}</div>`;
                break;
        }

        // Restore resize handles after updating content
        resizeHandles.forEach(handle => elementDiv.appendChild(handle));
        columnResizeHandles.forEach(handle => elementDiv.appendChild(handle));
    }

    renderTable(elementDiv, elementData) {
        const { properties } = elementData;
        const rows = properties.rows || 3;
        const cols = properties.columns || 3;
        const columnWidths = properties.columnWidths || Array(cols).fill(100 / cols);
        const fontSize = properties.fontSize || 12;
        const rowHeight = properties.rowHeight || 30;
        const showHeader = properties.showHeader !== false;
        const showBorders = properties.showBorders !== false;
        const borderWidth = showBorders ? (properties.borderWidth || 1) : 0;
        const borderColor = properties.borderColor || '#34495e';

        let tableHTML = '';

        // Header row (if enabled)
        if (showHeader) {
            tableHTML += '<div class="table-header table-row">';
            for (let i = 0; i < cols; i++) {
                const isLastCell = i === cols - 1;
                const borderRight = showBorders ?
                    (!isLastCell ? `${borderWidth}px solid ${borderColor}` : 'none') :
                    'none';
                tableHTML += `
        <div class="table-cell" style="width: ${columnWidths[i]}%; font-size: ${fontSize}pt; height: ${rowHeight}px; line-height: ${rowHeight}px; float: left; box-sizing: border-box; border-right: ${borderRight};">
            ${properties.headers?.[i] || `Header ${i + 1}`}
            ${i < cols - 1 ? '<div class="column-resize-handle" data-column="' + i + '"></div>' : ''}
        </div>`;
            }
            tableHTML += '<div style="clear: both;"></div></div>';
        }

        // Data rows
        const startRow = showHeader ? 1 : 0;
        const totalRows = showHeader ? rows : rows + 1;

        for (let i = startRow; i < totalRows; i++) {
            const isLastRow = i === totalRows - 1;
            const borderBottom = showBorders ?
                (!isLastRow ? `${borderWidth}px solid ${borderColor}` : 'none') :
                'none';
            tableHTML += `<div class="table-row" style="border-bottom: ${borderBottom}; height: ${rowHeight}px; line-height: ${rowHeight}px;">`;
            for (let j = 0; j < cols; j++) {
                const isLastCell = j === cols - 1;
                const borderRight = showBorders ?
                    (!isLastCell ? `${borderWidth}px solid ${borderColor}` : 'none') :
                    'none';
                tableHTML += `<div class="table-cell" style="width: ${columnWidths[j]}%; font-size: ${fontSize}pt; height: ${rowHeight}px; line-height: ${rowHeight}px; float: left; box-sizing: border-box; border-right: ${borderRight};">&nbsp;</div>`;
            }
            tableHTML += '<div style="clear: both;"></div></div>';
        }

        elementDiv.innerHTML = tableHTML;

        // Update table outer border and apply design mode styles
        this.applyTableDesignModeStyles(elementDiv, showBorders, borderWidth, borderColor);

        // Attach resize listeners
        this.attachColumnResizeListeners(elementDiv, elementData);
    }

    // Add this new method to handle design mode styling
    applyTableDesignModeStyles(tableDiv, showBorders, borderWidth, borderColor) {
        // Remove any existing design mode classes
        tableDiv.classList.remove('design-mode-dashed');

        if (showBorders) {
            // Show solid borders when enabled
            tableDiv.style.border = `${borderWidth}px solid ${borderColor}`;

            // Update all cells and rows to use solid borders
            const cells = tableDiv.querySelectorAll('.table-cell');
            cells.forEach(cell => {
                const currentBorder = cell.style.borderRight;
                if (currentBorder && currentBorder !== 'none') {
                    cell.style.borderRight = currentBorder.replace('dashed', 'solid');
                }
            });

            const rows = tableDiv.querySelectorAll('.table-row');
            rows.forEach(row => {
                const currentBorder = row.style.borderBottom;
                if (currentBorder && currentBorder !== 'none') {
                    row.style.borderBottom = currentBorder.replace('dashed', 'solid');
                }
            });
        } else {
            // In design mode, show dashed borders for visibility
            tableDiv.classList.add('design-mode-dashed');
            tableDiv.style.border = '1px dashed #95a5a6';

            // Add dashed borders to cells and rows for design mode visibility
            const cells = tableDiv.querySelectorAll('.table-cell');
            cells.forEach((cell, index) => {
                const cellsInRow = tableDiv.querySelectorAll('.table-row:first-child .table-cell').length;
                const isLastInRow = (index + 1) % cellsInRow === 0;
                if (!isLastInRow) {
                    cell.style.borderRight = '1px dashed #bdc3c7';
                } else {
                    cell.style.borderRight = 'none';
                }
            });

            const rows = tableDiv.querySelectorAll('.table-row');
            rows.forEach((row, index) => {
                if (index < rows.length - 1) {
                    row.style.borderBottom = '1px dashed #bdc3c7';
                } else {
                    row.style.borderBottom = 'none';
                }
            });
        }
    }

    // Add this new method to handle column resize listeners
    attachColumnResizeListeners(elementDiv, elementData) {
        const resizeHandles = elementDiv.querySelectorAll('.column-resize-handle');

        resizeHandles.forEach(handle => {
            // Remove any existing listeners
            const newHandle = handle.cloneNode(true);
            handle.parentNode.replaceChild(newHandle, handle);

            // Add new listener
            newHandle.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                e.preventDefault();
                const columnIndex = parseInt(e.target.dataset.column);
                this.startColumnResize(e, elementData);
            });
        });
    }

    applyElementStyles(elementDiv, elementData) {
        const { type, properties } = elementData;

        // Common text styles for both text-field and label
        if (['text-field', 'label'].includes(type)) {
            elementDiv.style.fontSize = `${properties.fontSize}pt`;
            elementDiv.style.color = properties.color;
            elementDiv.style.textAlign = properties.textAlign;
            elementDiv.style.fontWeight = properties.fontWeight;
            elementDiv.style.display = 'block';
            elementDiv.style.lineHeight = 'normal';
        }

        switch (type) {
            case 'rectangle':
                elementDiv.style.backgroundColor = properties.fillColor;
                elementDiv.style.border = `${properties.borderWidth}px solid ${properties.borderColor}`;
                break;

            case 'vline':
                // Use border instead of background for better printing
                elementDiv.style.borderLeft = `${properties.thickness}px solid ${properties.color}`;
                elementDiv.style.backgroundColor = 'transparent';
                elementDiv.style.width = `${properties.thickness}px`;
                break;

            case 'hline':
                // Use border instead of background for better printing
                elementDiv.style.borderTop = `${properties.thickness}px solid ${properties.color}`;
                elementDiv.style.backgroundColor = 'transparent';
                elementDiv.style.height = `${properties.thickness}px`;
                break;

            case 'signature':
                elementDiv.style.border = `1px dashed ${properties.borderColor}`;
                elementDiv.style.color = properties.color;
                break;
        }
    }

    isResizable(type) {
        return ['rectangle', 'text-field', 'label', 'vline', 'hline', 'signature', 'table'].includes(type);
    }

    addResizeHandles(elementDiv) {
        const element = this.getElementById(elementDiv.id);

        // For tables, only add horizontal (east and west) resize handles
        if (element && element.type === 'table') {
            const handles = ['e', 'w'];
            handles.forEach(handle => {
                const handleDiv = document.createElement('div');
                handleDiv.className = `resize-handle ${handle}`;
                handleDiv.style.zIndex = '10000'; // Explicitly set z-index
                handleDiv.style.pointerEvents = 'auto';
                handleDiv.addEventListener('mousedown', (e) => this.startResize(e, handle));
                elementDiv.appendChild(handleDiv);
            });
        } else {
            // For other elements, add all resize handles
            const handles = ['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se'];
            handles.forEach(handle => {
                const handleDiv = document.createElement('div');
                handleDiv.className = `resize-handle ${handle}`;
                handleDiv.style.zIndex = '10000'; // Explicitly set z-index
                handleDiv.style.pointerEvents = 'auto';
                handleDiv.addEventListener('mousedown', (e) => this.startResize(e, handle));
                elementDiv.appendChild(handleDiv);
            });
        }
    }

    makeDraggable(elementDiv) {
        elementDiv.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('resize-handle') ||
                e.target.classList.contains('column-resize-handle')) return;

            const element = this.getElementById(elementDiv.id);

            // Handle multi-selection with Ctrl key
            if (e.ctrlKey || e.metaKey) {
                e.stopPropagation();
                this.toggleElementSelection(element);
            } else {
                // If clicking on an already selected element, start dragging all
                if (!this.selectedElements.includes(element)) {
                    this.selectElement(element);
                }
                this.startDrag(e, elementDiv);
            }
        });
        elementDiv.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const element = this.getElementById(elementDiv.id);
            if (!this.selectedElements.includes(element)) {
                this.selectElement(element);
            }
            this.showContextMenu(e);
        });
    }

    startDrag(e, elementDiv) {
        e.preventDefault();
        e.stopPropagation();

        this.isDragging = true;

        const element = this.getElementById(elementDiv.id);
        const canvasRect = this.canvas.getBoundingClientRect();

        // Store initial positions for all selected elements
        const initialPositions = new Map();
        this.selectedElements.forEach(el => {
            initialPositions.set(el.id, { x: el.x, y: el.y });
        });

        // Calculate offset from mouse to element position
        const startX = (e.clientX - canvasRect.left) / this.zoom;
        const startY = (e.clientY - canvasRect.top) / this.zoom;

        const mouseMoveHandler = (e) => {
            if (!this.isDragging) return;

            const currentX = (e.clientX - canvasRect.left) / this.zoom;
            const currentY = (e.clientY - canvasRect.top) / this.zoom;

            const deltaX = currentX - startX;
            const deltaY = currentY - startY;

            // Move all selected elements
            this.selectedElements.forEach(el => {
                const initial = initialPositions.get(el.id);
                let newX = initial.x + deltaX;
                let newY = initial.y + deltaY;

                if (this.snapToGrid) {
                    newX = Math.round(newX / this.gridSize) * this.gridSize;
                    newY = Math.round(newY / this.gridSize) * this.gridSize;
                }

                // Boundary checking
                const bounds = this.getElementBounds(el);
                newX = Math.max(0, Math.min(newX, this.canvas.offsetWidth - bounds.width));
                newY = Math.max(0, Math.min(newY, this.canvas.offsetHeight - bounds.height));

                this.updateElementPosition(el.id, newX, newY);
            });
        };

        const mouseUpHandler = () => {
            this.isDragging = false;
            document.removeEventListener('mousemove', mouseMoveHandler);
            document.removeEventListener('mouseup', mouseUpHandler);

            if (this.selectedElements.length > 0) {
                this.captureState(`Move ${this.selectedElements.length} element(s)`);
            }
            this.saveToLocalStorage();
        };

        document.addEventListener('mousemove', mouseMoveHandler);
        document.addEventListener('mouseup', mouseUpHandler);
    }

    startResize(e, handle) {
        e.stopPropagation();
        this.isResizing = true;
        this.currentResizeHandle = handle;

        const element = this.getElementById(e.target.parentElement.id);
        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = element.width;
        const startHeight = element.height;
        const startLeft = element.x;
        const startTop = element.y;

        const mouseMoveHandler = (e) => {
            if (!this.isResizing) return;

            const deltaX = (e.clientX - startX) / this.zoom;
            const deltaY = (e.clientY - startY) / this.zoom;

            let newWidth = startWidth;
            let newHeight = startHeight;
            let newLeft = startLeft;
            let newTop = startTop;

            switch (handle) {
                case 'e':
                    newWidth = Math.max(20, startWidth + deltaX);
                    break;
                case 'w':
                    newWidth = Math.max(20, startWidth - deltaX);
                    newLeft = startLeft + deltaX;
                    break;
                case 's':
                    newHeight = Math.max(20, startHeight + deltaY);
                    break;
                case 'n':
                    newHeight = Math.max(20, startHeight - deltaY);
                    newTop = startTop + deltaY;
                    break;
                case 'se':
                    newWidth = Math.max(20, startWidth + deltaX);
                    newHeight = Math.max(20, startHeight + deltaY);
                    break;
                case 'sw':
                    newWidth = Math.max(20, startWidth - deltaX);
                    newHeight = Math.max(20, startHeight + deltaY);
                    newLeft = startLeft + deltaX;
                    break;
                case 'ne':
                    newWidth = Math.max(20, startWidth + deltaX);
                    newHeight = Math.max(20, startHeight - deltaY);
                    newTop = startTop + deltaY;
                    break;
                case 'nw':
                    newWidth = Math.max(20, startWidth - deltaX);
                    newHeight = Math.max(20, startHeight - deltaY);
                    newLeft = startLeft + deltaX;
                    newTop = startTop + deltaY;
                    break;
            }

            this.updateElementSize(element.id, newWidth, newHeight, newLeft, newTop);
        };

        const mouseUpHandler = () => {
            this.isResizing = false;
            this.currentResizeHandle = null;
            document.removeEventListener('mousemove', mouseMoveHandler);
            document.removeEventListener('mouseup', mouseUpHandler);

            if (this.selectedElements.length > 0) {
                this.captureState(`Resize ${this.selectedElements.length} element(s)`);
            }
            this.saveToLocalStorage();
        };

        document.addEventListener('mousemove', mouseMoveHandler);
        document.addEventListener('mouseup', mouseUpHandler);
    }

    startColumnResize(e, tableElement) {
        e.stopPropagation();
        e.preventDefault();

        this.isResizingColumn = true;
        const columnIndex = parseInt(e.target.dataset.column);
        this.resizingColumnIndex = columnIndex;

        const tableDiv = document.getElementById(tableElement.id);
        const tableWidth = tableDiv.offsetWidth;
        const startX = e.clientX;
        const startWidths = [...tableElement.properties.columnWidths];

        // Create a visual guide line
        const guideLine = document.createElement('div');
        guideLine.style.cssText = `
        position: absolute;
        top: ${tableDiv.offsetTop}px;
        left: ${e.clientX}px;
        width: 2px;
        height: ${tableDiv.offsetHeight}px;
        background: #3498db;
        z-index: 10000;
        pointer-events: none;
    `;
        document.body.appendChild(guideLine);

        const mouseMoveHandler = (e) => {
            if (!this.isResizingColumn) return;

            // Update guide line position
            guideLine.style.left = `${e.clientX}px`;

            const deltaX = (e.clientX - startX);
            const deltaPercent = (deltaX / tableWidth) * 100;

            // Calculate new widths
            const newWidths = [...startWidths];
            const currentWidth = startWidths[columnIndex];
            const nextWidth = startWidths[columnIndex + 1];

            // Minimum width of 5%
            const newCurrentWidth = Math.max(5, Math.min(currentWidth + deltaPercent, currentWidth + nextWidth - 5));
            const widthChange = newCurrentWidth - currentWidth;

            newWidths[columnIndex] = newCurrentWidth;
            newWidths[columnIndex + 1] = Math.max(5, nextWidth - widthChange);

            // Ensure percentages add up to 100
            const total = newWidths.reduce((sum, w) => sum + w, 0);
            if (Math.abs(total - 100) > 0.01) {
                const adjustment = 100 / total;
                newWidths.forEach((w, i) => {
                    newWidths[i] = w * adjustment;
                });
            }

            // Update the table element properties but don't fully re-render
            tableElement.properties.columnWidths = newWidths;

            // Update the table visually without full re-render for better performance
            this.updateTableColumns(tableDiv, newWidths);
        };

        const mouseUpHandler = () => {
            this.isResizingColumn = false;
            this.resizingColumnIndex = null;

            // Remove guide line
            guideLine.remove();

            document.removeEventListener('mousemove', mouseMoveHandler);
            document.removeEventListener('mouseup', mouseUpHandler);

            // Final render with the updated state
            this.renderElement(tableElement);
            this.captureState('Resize table columns');
            this.saveToLocalStorage();
        };

        document.addEventListener('mousemove', mouseMoveHandler);
        document.addEventListener('mouseup', mouseUpHandler);
    }

    // Add this new method to update table columns without full re-render
    updateTableColumns(tableDiv, columnWidths) {
        const cells = tableDiv.querySelectorAll('.table-cell');
        cells.forEach((cell, index) => {
            const columnIndex = index % columnWidths.length;
            cell.style.width = `${columnWidths[columnIndex]}%`;
        });
    }

    updateElementPosition(id, x, y) {
        const element = this.getElementById(id);
        if (element) {
            element.x = x;
            element.y = y;
            this.renderElement(element);
        }
    }

    updateElementSize(id, width, height, x, y) {
        const element = this.getElementById(id);
        if (element) {
            element.width = width;
            element.height = height;
            element.x = x;
            element.y = y;
            this.renderElement(element);
        }
    }

    getElementById(id) {
        return this.elements.find(el => el.id === id);
    }

    handleCanvasClick(e) {
        // Only deselect when clicking on empty canvas with no modifiers
        // AND not currently performing any operations
        if ((e.target === this.canvas || e.target.classList.contains('canvas-grid')) &&
            !this.isMarqueeSelecting &&
            !this.isDragging &&
            !this.isResizing &&
            !this.isResizingColumn &&
            !e.ctrlKey && !e.metaKey) {
            this.deselectAll();
        }
    }

    handleCanvasMouseDown(e) {
        // Only start marquee selection if clicking directly on canvas or grid
        if ((e.target === this.canvas || e.target.classList.contains('canvas-grid')) &&
            !e.ctrlKey && !e.metaKey) {

            // Don't start marquee if clicking on an element
            if (e.target.closest('.design-element')) {
                return;
            }

            this.startMarqueeSelection(e);
        }
    }

    startMarqueeSelection(e) {
        this.isMarqueeSelecting = true;
        const canvasRect = this.canvas.getBoundingClientRect();

        this.marqueeStart = {
            x: (e.clientX - canvasRect.left) / this.zoom,
            y: (e.clientY - canvasRect.top) / this.zoom
        };

        const marquee = document.createElement('div');
        marquee.className = 'selection-marquee';
        marquee.style.left = `${this.marqueeStart.x}px`;
        marquee.style.top = `${this.marqueeStart.y}px`;
        this.canvas.appendChild(marquee);

        const mouseMoveHandler = (e) => {
            if (!this.isMarqueeSelecting) return;

            const currentX = (e.clientX - canvasRect.left) / this.zoom;
            const currentY = (e.clientY - canvasRect.top) / this.zoom;

            const left = Math.min(this.marqueeStart.x, currentX);
            const top = Math.min(this.marqueeStart.y, currentY);
            const width = Math.abs(currentX - this.marqueeStart.x);
            const height = Math.abs(currentY - this.marqueeStart.y);

            marquee.style.left = `${left}px`;
            marquee.style.top = `${top}px`;
            marquee.style.width = `${width}px`;
            marquee.style.height = `${height}px`;

            this.highlightElementsInMarquee(left, top, width, height);
        };

        const mouseUpHandler = (e) => {
            this.isMarqueeSelecting = false;

            const currentX = (e.clientX - canvasRect.left) / this.zoom;
            const currentY = (e.clientY - canvasRect.top) / this.zoom;

            const left = Math.min(this.marqueeStart.x, currentX);
            const top = Math.min(this.marqueeStart.y, currentY);
            const width = Math.abs(currentX - this.marqueeStart.x);
            const height = Math.abs(currentY - this.marqueeStart.y);

            this.selectElementsInMarquee(left, top, width, height);
            marquee.remove();

            document.removeEventListener('mousemove', mouseMoveHandler);
            document.removeEventListener('mouseup', mouseUpHandler);
        };

        document.addEventListener('mousemove', mouseMoveHandler);
        document.addEventListener('mouseup', mouseUpHandler);
    }

    highlightElementsInMarquee(left, top, width, height) {
        this.elements.forEach(element => {
            const elementDiv = document.getElementById(element.id);
            if (!elementDiv) return;

            const bounds = this.getElementBounds(element);

            const intersects = this.rectanglesIntersect(
                left, top, width, height,
                bounds.x, bounds.y, bounds.width, bounds.height
            );

            if (intersects) {
                elementDiv.classList.add('marquee-highlight');
            } else {
                elementDiv.classList.remove('marquee-highlight');
            }
        });
    }

    selectElementsInMarquee(left, top, width, height) {
        // Clear previous selection
        this.deselectAll();

        this.elements.forEach(element => {
            const bounds = this.getElementBounds(element);

            const elementRect = {
                left: bounds.x,
                top: bounds.y,
                right: bounds.x + bounds.width,
                bottom: bounds.y + bounds.height
            };

            const marqueeRect = {
                left: left,
                top: top,
                right: left + width,
                bottom: top + height
            };

            // Check if element is completely or partially within marquee
            const intersects = !(marqueeRect.right < elementRect.left ||
                marqueeRect.left > elementRect.right ||
                marqueeRect.bottom < elementRect.top ||
                marqueeRect.top > elementRect.bottom);

            if (intersects) {
                this.addToSelection(element);
            }
        });

        // Clean up highlight
        document.querySelectorAll('.design-element.marquee-highlight').forEach(el => {
            el.classList.remove('marquee-highlight');
        });

        this.showPropertiesPanel(this.selectedElements.length === 1 ? this.selectedElements[0] : null);
    }
    
    getElementBounds(element) {
        if (element.type === 'checkbox') {
            // For checkboxes, calculate actual rendered size
            const elementDiv = document.getElementById(element.id);
            if (elementDiv) {
                const rect = elementDiv.getBoundingClientRect();
                const canvasRect = this.canvas.getBoundingClientRect();

                return {
                    x: element.x, // Always use the stored x,y for position
                    y: element.y,
                    width: (rect.width / this.zoom) || element.width || 100, // Fallback values
                    height: (rect.height / this.zoom) || element.height || 30
                };
            }
        }
        // For other elements, use stored dimensions
        return {
            x: element.x,
            y: element.y,
            width: element.width || 100, // Add fallbacks
            height: element.height || 30
        };
    }

    rectanglesIntersect(x1, y1, w1, h1, x2, y2, w2, h2) {
        return x1 < x2 + w2 &&
            x1 + w1 > x2 &&
            y1 < y2 + h2 &&
            y1 + h1 > y2;
    }

    selectElement(element) {
        if (this.selectedElements.includes(element)) {
            return;
        } else {
            // If not selected and no modifier key, clear existing selection
            if (!this.isMarqueeSelecting) {
                this.deselectAll();
            }
            this.addToSelection(element);
        }

        this.selectedElement = this.selectedElements.length === 1 ? this.selectedElements[0] : null;
        this.showPropertiesPanel(this.selectedElement);
    }

    toggleElementSelection(element) {
        const index = this.selectedElements.indexOf(element);

        if (index > -1) {
            this.selectedElements.splice(index, 1);
            const elementDiv = document.getElementById(element.id);
            if (elementDiv) {
                elementDiv.classList.remove('selected');
            }
        } else {
            this.addToSelection(element);
        }

        this.selectedElement = this.selectedElements.length === 1 ? this.selectedElements[0] : null;
        this.showPropertiesPanel(this.selectedElement);
    }

    addToSelection(element) {
        if (!this.selectedElements.includes(element)) {
            this.selectedElements.push(element);
            const elementDiv = document.getElementById(element.id);
            if (elementDiv) {
                elementDiv.classList.add('selected');
                // Ensure resize handles are visible
                elementDiv.querySelectorAll('.resize-handle').forEach(handle => {
                    handle.style.display = 'block';
                });
            }
        }
    }

    selectAll() {
        this.deselectAll();
        this.elements.forEach(element => {
            this.addToSelection(element);
        });
        this.selectedElement = this.selectedElements.length === 1 ? this.selectedElements[0] : null;
        this.showPropertiesPanel(this.selectedElement);
    }

    deselectAll() {
        this.selectedElement = null;
        this.selectedElements = [];
        document.querySelectorAll('.design-element').forEach(el => {
            el.classList.remove('selected');
            el.classList.remove('marquee-highlight');
            // Hide resize handles
            el.querySelectorAll('.resize-handle').forEach(handle => {
                handle.style.display = 'none';
            });
        });
        this.showPropertiesPanel(null);
    }

    showPropertiesPanel(element) {
        if (!element && this.selectedElements.length === 0) {
            this.propertiesContent.innerHTML = `
            <div class="no-selection">
                <i class="fas fa-mouse-pointer"></i>
                <p>Select an element to edit its properties</p>
                <small style="color: #95a5a6; margin-top: 10px; display: block;">
                    <strong>Multi-select:</strong> Ctrl+Click or drag to select multiple elements
                </small>
            </div>
        `;
            return;
        }

        // Multi-selection mode
        if (this.selectedElements.length > 1) {
            this.showBulkPropertiesPanel();
            return;
        }

        // Single selection mode (keep your existing code here)
        let propertiesHTML = `
        <div class="property-group">
            <h4>Element ID</h4>
            <div class="form-group">
                <label>Custom ID (Optional)</label>
                <input type="text" value="${element.properties.elementId || ''}" 
                       onchange="designer.updateElementId('${element.id}', this.value)"
                       placeholder="Enter unique ID">
                <small style="display: block; margin-top: 4px; color: #7f8c8d; font-size: 11px;">
                    Internal ID: ${element.id}
                </small>
            </div>
        </div>
            
    `;

        propertiesHTML += this.getTypeSpecificProperties(element);

        propertiesHTML += `
        <div class="property-group">
            <h4>Position & Size</h4>
                <div class="form-group">
                    <label>X Position</label>
                    <input type="number" value="${element.x}" onchange="designer.updateElementProperty('${element.id}', 'x', this.value)">
                </div>
                <div class="form-group">
                    <label>Y Position</label>
                    <input type="number" value="${element.y}" onchange="designer.updateElementProperty('${element.id}', 'y', this.value)">
                </div>
            `;

        if (element.type !== 'table' && element.type !== 'checkbox') {
            propertiesHTML += `
                <div class="form-group">
                    <label>Width</label>
                    <input type="number" value="${element.width}" onchange="designer.updateElementProperty('${element.id}', 'width', this.value)">
                </div>
                <div class="form-group">
                    <label>Height</label>
                    <input type="number" value="${element.height}" onchange="designer.updateElementProperty('${element.id}', 'height', this.value)">
                </div>
            `;
        }

        propertiesHTML += `</div>`;

        this.propertiesContent.innerHTML = propertiesHTML;
    }

    showBulkPropertiesPanel() {
        const elementTypes = [...new Set(this.selectedElements.map(el => el.type))];
        const allSameType = elementTypes.length === 1;
        const textTypes = ['text-field', 'label'];
        const allTextElements = this.selectedElements.every(el => textTypes.includes(el.type));

        let propertiesHTML = `
        <div class="property-group" style="background: #e8f4f8; border-color: #3498db;">
            <h4><i class="fas fa-layer-group"></i> Multiple Selection (${this.selectedElements.length})</h4>
            <p style="font-size: 12px; color: #7f8c8d; margin-bottom: 10px;">
                ${allSameType ? `All ${elementTypes[0]} elements` : 'Mixed element types'}
            </p>
        </div>
    `;

        // Show common text properties if all are text elements
        if (allTextElements) {
            const firstEl = this.selectedElements[0];

            propertiesHTML += `
            <div class="property-group">
                <h4>Text Properties</h4>
                <div class="form-group">
                    <label>Font Size (pt)</label>
                    <input type="number" value="${firstEl.properties.fontSize}" 
                           onchange="designer.bulkUpdateProperty('fontSize', this.value)">
                </div>
                <div class="form-group">
                    <label>Text Color</label>
                    <div class="color-input">
                        <input type="color" value="${firstEl.properties.color}" 
                               onchange="designer.bulkUpdateProperty('color', this.value)">
                        <input type="text" value="${firstEl.properties.color}" 
                               onchange="designer.bulkUpdateProperty('color', this.value)">
                    </div>
                </div>
                <div class="form-group">
                    <label>Text Align</label>
                    <select onchange="designer.bulkUpdateProperty('textAlign', this.value)">
                        <option value="left" ${firstEl.properties.textAlign === 'left' ? 'selected' : ''}>Left</option>
                        <option value="center" ${firstEl.properties.textAlign === 'center' ? 'selected' : ''}>Center</option>
                        <option value="right" ${firstEl.properties.textAlign === 'right' ? 'selected' : ''}>Right</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Font Weight</label>
                    <select onchange="designer.bulkUpdateProperty('fontWeight', this.value)">
                        <option value="normal" ${firstEl.properties.fontWeight === 'normal' ? 'selected' : ''}>Normal</option>
                        <option value="bold" ${firstEl.properties.fontWeight === 'bold' ? 'selected' : ''}>Bold</option>
                    </select>
                </div>
            </div>
        `;
        }

        propertiesHTML += `
        <div class="property-group">
            <h4>Bulk Actions</h4>
            <button class="btn btn-secondary" onclick="designer.alignSelected('left')" style="width: 100%; margin-bottom: 8px;">
                <i class="fas fa-align-left"></i> Align Left
            </button>
            <button class="btn btn-secondary" onclick="designer.alignSelected('center')" style="width: 100%; margin-bottom: 8px;">
                <i class="fas fa-align-center"></i> Align Center
            </button>
            <button class="btn btn-secondary" onclick="designer.alignSelected('right')" style="width: 100%; margin-bottom: 8px;">
                <i class="fas fa-align-right"></i> Align Right
            </button>
            <button class="btn btn-secondary" onclick="designer.alignSelected('top')" style="width: 100%; margin-bottom: 8px;">
                <i class="fas fa-arrow-up"></i> Align Top
            </button>
            <button class="btn btn-secondary" onclick="designer.alignSelected('bottom')" style="width: 100%; margin-bottom: 8px;">
                <i class="fas fa-arrow-down"></i> Align Bottom
            </button>
            <button class="btn btn-secondary" onclick="designer.distributeSelected('horizontal')" style="width: 100%; margin-bottom: 8px;">
                <i class="fas fa-arrows-left-right"></i> Distribute Horizontally
            </button>
            <button class="btn btn-secondary" onclick="designer.distributeSelected('vertical')" style="width: 100%;">
                <i class="fas fa-arrows-up-down"></i> Distribute Vertically
            </button>
        </div>
    `;

        this.propertiesContent.innerHTML = propertiesHTML;
    }

    bulkUpdateProperty(property, value) {
        const textTypes = ['text-field', 'label'];

        this.selectedElements.forEach(element => {
            if (textTypes.includes(element.type)) {
                if (property === 'fontSize') {
                    element.properties[property] = parseInt(value);
                } else {
                    element.properties[property] = value;
                }
                this.renderElement(element);
            }
        });

        this.saveToLocalStorage();
    }

    alignSelected(direction) {
        if (this.selectedElements.length < 2) return;

        switch (direction) {
            case 'left':
                const minX = Math.min(...this.selectedElements.map(el => el.x));
                this.selectedElements.forEach(el => {
                    el.x = minX;
                    this.renderElement(el);
                });
                break;
            case 'right':
                // Use bounds for right alignment to account for element width
                const elementsWithBounds = this.selectedElements.map(el => ({
                    element: el,
                    bounds: this.getElementBounds(el)
                }));
                const maxRight = Math.max(...elementsWithBounds.map(({ element, bounds }) => element.x + bounds.width));
                elementsWithBounds.forEach(({ element, bounds }) => {
                    element.x = maxRight - bounds.width;
                    this.renderElement(element);
                });
                break;
            case 'center':
                const avgX = this.selectedElements.reduce((sum, el) => sum + el.x + (this.getElementBounds(el).width / 2), 0) / this.selectedElements.length;
                this.selectedElements.forEach(el => {
                    const bounds = this.getElementBounds(el);
                    el.x = avgX - (bounds.width / 2);
                    this.renderElement(el);
                });
                break;
            case 'top':
                const minY = Math.min(...this.selectedElements.map(el => el.y));
                this.selectedElements.forEach(el => {
                    el.y = minY;
                    this.renderElement(el);
                });
                break;
            case 'bottom':
                // Use bounds for bottom alignment to account for element height
                const elementsWithBoundsBottom = this.selectedElements.map(el => ({
                    element: el,
                    bounds: this.getElementBounds(el)
                }));
                const maxBottom = Math.max(...elementsWithBoundsBottom.map(({ element, bounds }) => element.y + bounds.height));
                elementsWithBoundsBottom.forEach(({ element, bounds }) => {
                    element.y = maxBottom - bounds.height;
                    this.renderElement(element);
                });
                break;
        }

        this.saveToLocalStorage();
    }

    distributeSelected(direction) {
        if (this.selectedElements.length < 3) return;

        const elementsWithBounds = this.selectedElements.map(el => ({
            element: el,
            bounds: this.getElementBounds(el)
        }));

        const sorted = [...elementsWithBounds].sort((a, b) => {
            return direction === 'horizontal' ? a.element.x - b.element.x : a.element.y - b.element.y;
        });

        if (direction === 'horizontal') {
            const start = sorted[0].element.x;
            const end = sorted[sorted.length - 1].element.x + sorted[sorted.length - 1].bounds.width;
            const totalWidth = sorted.reduce((sum, item) => sum + item.bounds.width, 0);
            const gap = (end - start - totalWidth) / (sorted.length - 1);

            let currentX = start;
            sorted.forEach(item => {
                item.element.x = currentX;
                currentX += item.bounds.width + gap;
                this.renderElement(item.element);
            });
        } else {
            const start = sorted[0].element.y;
            const end = sorted[sorted.length - 1].element.y + sorted[sorted.length - 1].bounds.height;
            const totalHeight = sorted.reduce((sum, item) => sum + item.bounds.height, 0);
            const gap = (end - start - totalHeight) / (sorted.length - 1);

            let currentY = start;
            sorted.forEach(item => {
                item.element.y = currentY;
                currentY += item.bounds.height + gap;
                this.renderElement(item.element);
            });
        }

        this.saveToLocalStorage();
    }

    getTypeSpecificProperties(element) {
        const { type, properties } = element;

        const commonTextProperties = `
            <div class="form-group">
                <label>Text Content</label>
                <input type="text" value="${properties.text}" onchange="designer.updateElementProperty('${element.id}', 'text', this.value)">
            </div>
            <div class="form-group">
                <label>Font Size (pt)</label>
                <input type="number" value="${properties.fontSize}" onchange="designer.updateElementProperty('${element.id}', 'fontSize', this.value)">
            </div>
            <div class="form-group">
                <label>Text Color</label>
                <div class="color-input">
                    <input type="color" value="${properties.color}" onchange="designer.updateElementProperty('${element.id}', 'color', this.value)">
                    <input type="text" value="${properties.color}" onchange="designer.updateElementProperty('${element.id}', 'color', this.value)">
                </div>
            </div>
            <div class="form-group">
                <label>Text Align</label>
                <select onchange="designer.updateElementProperty('${element.id}', 'textAlign', this.value)">
                    <option value="left" ${properties.textAlign === 'left' ? 'selected' : ''}>Left</option>
                    <option value="center" ${properties.textAlign === 'center' ? 'selected' : ''}>Center</option>
                    <option value="right" ${properties.textAlign === 'right' ? 'selected' : ''}>Right</option>
                </select>
            </div>
            <div class="form-group">
                <label>Font Weight</label>
                <select onchange="designer.updateElementProperty('${element.id}', 'fontWeight', this.value)">
                    <option value="normal" ${properties.fontWeight === 'normal' ? 'selected' : ''}>Normal</option>
                    <option value="bold" ${properties.fontWeight === 'bold' ? 'selected' : ''}>Bold</option>
                </select>
            </div>
        `;

        switch (type) {
            case 'text-field':
                return `
                <div class="property-group">
                    <h4>Text Field</h4>
                    ${commonTextProperties}
                </div>
            `;

            case 'rectangle':
                return `
                    <div class="property-group">
                        <h4>Rectangle</h4>
                        <div class="form-group">
                            <label>Fill Color</label>
                            <div class="color-input">
                                <input type="color" value="${properties.fillColor}" onchange="designer.updateElementProperty('${element.id}', 'fillColor', this.value)">
                                <input type="text" value="${properties.fillColor}" onchange="designer.updateElementProperty('${element.id}', 'fillColor', this.value)">
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Border Color</label>
                            <div class="color-input">
                                <input type="color" value="${properties.borderColor}" onchange="designer.updateElementProperty('${element.id}', 'borderColor', this.value)">
                                <input type="text" value="${properties.borderColor}" onchange="designer.updateElementProperty('${element.id}', 'borderColor', this.value)">
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Border Width</label>
                            <input type="number" value="${properties.borderWidth}" onchange="designer.updateElementProperty('${element.id}', 'borderWidth', this.value)">
                        </div>
                    </div>
                `;

            case 'vline':
            case 'hline':
                return `
                    <div class="property-group">
                        <h4>Line</h4>
                        <div class="form-group">
                            <label>Color</label>
                            <div class="color-input">
                                <input type="color" value="${properties.color}" onchange="designer.updateElementProperty('${element.id}', 'color', this.value)">
                                <input type="text" value="${properties.color}" onchange="designer.updateElementProperty('${element.id}', 'color', this.value)">
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Thickness</label>
                            <input type="number" value="${properties.thickness}" onchange="designer.updateElementProperty('${element.id}', 'thickness', this.value)">
                        </div>
                    </div>
                `;

            case 'table':
                let columnControls = '';
                if (properties.columnWidths) {
                    properties.columnWidths.forEach((width, index) => {
                        columnControls += `
                            <div class="form-group">
                                <label>Column ${index + 1} Width (%)</label>
                                <input type="number" value="${width.toFixed(2)}" step="0.1" min="5" max="95"
                                       onchange="designer.updateTableColumnWidth('${element.id}', ${index}, this.value)">
                            </div>
                        `;
                    });
                }

                return `
                    <div class="property-group">
                        <h4>Table Structure</h4>
                        <div class="form-group">
                            <label>Rows</label>
                            <input type="number" value="${properties.rows}" min="1" max="20" onchange="designer.updateTableProperty('${element.id}', 'rows', this.value)">
                        </div>
                        <div class="form-group">
                            <label>Columns</label>
                            <input type="number" value="${properties.columns}" min="1" max="10" onchange="designer.updateTableProperty('${element.id}', 'columns', this.value)">
                        </div>
                        <div class="form-group">
                            <label>Row Height (px)</label>
                            <input type="number" value="${properties.rowHeight || 30}" min="20" max="100" onchange="designer.updateTableProperty('${element.id}', 'rowHeight', this.value)">
                        </div>
                        <div class="form-group">
                            <label>Font Size (pt)</label>
                            <input type="number" value="${properties.fontSize || 12}" min="6" max="72" onchange="designer.updateTableProperty('${element.id}', 'fontSize', this.value)">
                        </div>
                    </div>
                    <div class="property-group">
                        <h4>Border Settings</h4>
                        <div class="form-group">
                            <label>
                                <input type="checkbox" ${properties.showBorders !== false ? 'checked' : ''} 
                                       onchange="designer.updateTableProperty('${element.id}', 'showBorders', this.checked)">
                                Show All Borders
                            </label>
                            <small style="display: block; color: #7f8c8d; margin-top: 4px;">
                                When unchecked, all borders (table and cells) will be hidden in export/print
                            </small>
                        </div>
                        <div class="form-group">
                            <label>Border Width (px)</label>
                            <input type="number" value="${properties.borderWidth || 1}" min="0" max="5" 
                                   onchange="designer.updateTableProperty('${element.id}', 'borderWidth', this.value)"
                                   ${properties.showBorders === false ? 'disabled' : ''}>
                        </div>
                        <div class="form-group">
                            <label>Border Color</label>
                            <div class="color-input">
                                <input type="color" value="${properties.borderColor || '#34495e'}" 
                                       onchange="designer.updateTableProperty('${element.id}', 'borderColor', this.value)"
                                       ${properties.showBorders === false ? 'disabled' : ''}>
                                <input type="text" value="${properties.borderColor || '#34495e'}" 
                                       onchange="designer.updateTableProperty('${element.id}', 'borderColor', this.value)"
                                       ${properties.showBorders === false ? 'disabled' : ''}>
                            </div>
                        </div>
                    </div>
                    <div class="property-group">
                        <h4>Header Text (comma separated)</h4>
                        <div class="form-group">
                            <input type="text" value="${properties.headers.join(', ')}" onchange="designer.updateTableHeaders('${element.id}', this.value)" placeholder="Header 1, Header 2, Header 3">
                        </div>
                    </div>
                    <div class="property-group">
                        <h4>Column Widths</h4>
                        ${columnControls}
                    </div>
                    `;

            case 'label':
                return `
                    <div class="property-group">
                        <h4>Text Label</h4>
                        ${commonTextProperties}
                    </div>
                `;

            case 'checkbox':
                return `
                    <div class="property-group">
                        <h4>Checkbox</h4>
                        <div class="form-group">
                            <label>Label Text</label>
                            <input type="text" value="${properties.text || 'Checkbox'}" onchange="designer.updateElementProperty('${element.id}', 'text', this.value)">
                        </div>
                        <div class="form-group">
                            <label>Font Size (pt)</label>
                            <input type="number" value="${properties.fontSize || 14}" min="8" max="72" onchange="designer.updateElementProperty('${element.id}', 'fontSize', this.value)">
                        </div>
                        <div class="form-group">
                            <label>Checkbox Size (px)</label>
                            <input type="number" value="${properties.checkboxSize || 16}" min="12" max="32" onchange="designer.updateElementProperty('${element.id}', 'checkboxSize', this.value)">
                        </div>
                        <div class="form-group">
                            <label>Label Position</label>
                            <div style="display: flex; gap: 15px; margin-top: 8px;">
                                <label style="display: flex; align-items: center; gap: 5px; text-transform: none; font-weight: normal;">
                                    <input type="radio" name="labelPosition_${element.id}" value="left" ${(properties.labelPosition || 'right') === 'left' ? 'checked' : ''} onchange="designer.updateElementProperty('${element.id}', 'labelPosition', this.value)">
                                    Left
                                </label>
                                <label style="display: flex; align-items: center; gap: 5px; text-transform: none; font-weight: normal;">
                                    <input type="radio" name="labelPosition_${element.id}" value="right" ${(properties.labelPosition || 'right') === 'right' ? 'checked' : ''} onchange="designer.updateElementProperty('${element.id}', 'labelPosition', this.value)">
                                    Right
                                </label>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Spacing Gap (px)</label>
                            <input type="number" value="${properties.labelGap || 8}" min="0" max="50" onchange="designer.updateElementProperty('${element.id}', 'labelGap', this.value)">
                        </div>
                    </div>
                `;

            case 'signature':
                return `
                    <div class="property-group">
                        <h4>Signature Box</h4>
                        <div class="form-group">
                            <label>Label Text</label>
                            <input type="text" value="${properties.text}" onchange="designer.updateElementProperty('${element.id}', 'text', this.value)">
                        </div>
                        <div class="form-group">
                            <label>Border Color</label>
                            <div class="color-input">
                                <input type="color" value="${properties.borderColor}" onchange="designer.updateElementProperty('${element.id}', 'borderColor', this.value)">
                                <input type="text" value="${properties.borderColor}" onchange="designer.updateElementProperty('${element.id}', 'borderColor', this.value)">
                            </div>
                        </div>
                    </div>
                `;

            default:
                return '';
        }
    }

    updateElementId(elementId, newId) {
        if (newId.trim() === '') {
            this.updateElementProperty(elementId, 'elementId', '');
            return;
        }

        // Check if ID already exists
        const existingElement = this.elements.find(el =>
            el.properties.elementId === newId && el.id !== elementId
        );

        if (existingElement) {
            alert('This ID is already used by another element. Please choose a different ID.');
            // Reset the input to the previous value
            const element = this.getElementById(elementId);
            const input = document.querySelector(`input[onchange*="updateElementId('${elementId}'"]`);
            if (input) {
                input.value = element.properties.elementId;
            }
        } else {
            this.updateElementProperty(elementId, 'elementId', newId);
        }
    }

    updateElementProperty(elementId, property, value) {
        const element = this.getElementById(elementId);
        if (element) {
            if (property === 'x' || property === 'y' || property === 'width' || property === 'height') {
                element[property] = parseInt(value);
            } else if (property === 'fontSize') {
                element.properties[property] = parseInt(value);
            } else {
                element.properties[property] = value;
            }
            this.renderElement(element);
            this.saveToLocalStorage();
        }
    }

    updateTableProperty(elementId, property, value) {
        const element = this.getElementById(elementId);
        if (element && element.type === 'table') {
            let newValue = value;

            if (['rows', 'columns', 'rowHeight', 'fontSize', 'borderWidth'].includes(property)) {
                newValue = parseInt(value);
            } else if (property === 'showHeader' || property === 'showBorders') {
                newValue = Boolean(value);
            }

            element.properties[property] = newValue;

            // Force complete re-render when structural properties change
            if (['rows', 'columns', 'rowHeight', 'fontSize', 'showHeader', 'showBorders'].includes(property)) {
                // Remove the element and re-render it completely
                const elementDiv = document.getElementById(elementId);
                if (elementDiv) {
                    elementDiv.remove();
                }
                this.renderElement(element);
            }

            // Enable/disable border controls based on showBorders state
            if (property === 'showBorders') {
                // Re-render to update the disabled state of border controls
                this.showPropertiesPanel(element);
            }

            // Initialize or update column widths and headers when columns change
            if (property === 'columns') {
                const currentColumns = element.properties.columnWidths?.length || 0;
                if (newValue > currentColumns) {
                    // Add new columns with equal distribution
                    const equalWidth = 100 / newValue;
                    element.properties.columnWidths = Array(newValue).fill(equalWidth);
                    element.properties.headers = [
                        ...(element.properties.headers || Array(currentColumns).fill('Header')),
                        ...Array(newValue - currentColumns).fill('Header')
                    ];

                    // Force re-render after adding columns
                    const elementDiv = document.getElementById(elementId);
                    if (elementDiv) {
                        elementDiv.remove();
                    }
                    this.renderElement(element);
                } else if (newValue < currentColumns) {
                    // Remove columns and redistribute percentages
                    element.properties.columnWidths = element.properties.columnWidths.slice(0, newValue);
                    element.properties.headers = element.properties.headers.slice(0, newValue);

                    // Normalize to 100%
                    const total = element.properties.columnWidths.reduce((sum, w) => sum + w, 0);
                    element.properties.columnWidths = element.properties.columnWidths.map(w => (w / total) * 100);

                    // Force re-render after removing columns
                    const elementDiv = document.getElementById(elementId);
                    if (elementDiv) {
                        elementDiv.remove();
                    }
                    this.renderElement(element);
                }
            }

            // For other properties that should trigger re-render
            if (['rowHeight', 'fontSize', 'showHeader'].includes(property)) {
                const elementDiv = document.getElementById(elementId);
                if (elementDiv) {
                    elementDiv.remove();
                }
                this.renderElement(element);
            }

            this.captureState(`Update table ${property}`);
            this.saveToLocalStorage();
        }
    }

    updateTableColumnWidth(elementId, columnIndex, width) {
        const element = this.getElementById(elementId);
        if (element && element.type === 'table') {
            const newWidth = parseFloat(width);
            if (newWidth < 5 || newWidth > 95) {
                alert('Column width must be between 5% and 95%');
                this.showPropertiesPanel(element);
                return;
            }

            element.properties.columnWidths[columnIndex] = newWidth;

            // Normalize all widths to add up to 100%
            const total = element.properties.columnWidths.reduce((sum, w) => sum + w, 0);
            element.properties.columnWidths = element.properties.columnWidths.map(w => (w / total) * 100);

            this.renderElement(element);
            this.showPropertiesPanel(element);
            this.saveToLocalStorage();
        }
    }

    updateTableHeaders(elementId, headersText) {
        const element = this.getElementById(elementId);
        if (element && element.type === 'table') {
            element.properties.headers = headersText.split(',').map(h => h.trim());
            this.renderElement(element);
            this.saveToLocalStorage();
        }
    }

    // Paper size handling
    handlePaperSizeChange(e) {
        const size = e.target.value;
        const customInputs = document.getElementById('customSizeInputs');

        if (size === 'custom') {
            customInputs.style.display = 'flex';
        } else {
            customInputs.style.display = 'none';
            this.applyPaperSize(size);
        }
    }

    applyPaperSize(size) {
        const paperSizes = {
            'a4': { width: '210mm', height: '297mm' },
            'letter': { width: '216mm', height: '279mm' },
            'legal': { width: '216mm', height: '356mm' }
        };

        const sizeConfig = paperSizes[size];
        if (sizeConfig) {
            this.canvas.className = 'design-canvas';
            this.canvas.classList.add(`${size}-paper`);
            this.canvas.style.width = sizeConfig.width;
            this.canvas.style.height = sizeConfig.height;
            this.canvas.style.minHeight = sizeConfig.height;
        }
    }

    applyCustomSize() {
        const width = document.getElementById('customWidth').value;
        const height = document.getElementById('customHeight').value;

        this.canvas.className = 'design-canvas';
        this.canvas.style.width = `${width}mm`;
        this.canvas.style.height = `${height}mm`;
        this.canvas.style.minHeight = `${height}mm`;
    }

    // Zoom controls
    adjustZoom(delta) {
        this.zoom = Math.max(0.5, Math.min(2, this.zoom + delta));
        this.canvas.style.transform = `scale(${this.zoom})`;
        document.getElementById('zoomLevel').textContent = `${Math.round(this.zoom * 100)}%`;
    }

    toggleGrid() {
        this.showGrid = !this.showGrid;
        this.updateGridVisibility();
        this.saveToLocalStorage();
    }

    toggleSnapToGrid() {
        this.snapToGrid = !this.snapToGrid;
        this.updateGridVisibility();
        this.saveToLocalStorage();
    }

    // Context menu
    showContextMenu(e) {
        e.preventDefault();
        this.hideContextMenu();

        const contextMenu = document.createElement('div');
        contextMenu.className = 'context-menu';
        contextMenu.style.left = `${e.clientX}px`;
        contextMenu.style.top = `${e.clientY}px`;

        const multipleSelected = this.selectedElements.length > 1;

        contextMenu.innerHTML = `
        <div class="context-menu-item" onclick="designer.deleteSelectedElements()">
            <i class="fas fa-trash"></i> Delete ${multipleSelected ? `(${this.selectedElements.length})` : ''}
        </div>
        <div class="context-menu-item" onclick="designer.duplicateSelectedElements()">
            <i class="fas fa-copy"></i> Duplicate ${multipleSelected ? `(${this.selectedElements.length})` : ''}
        </div>
        ${!multipleSelected ? `
        <div class="context-menu-item" onclick="designer.bringToFront()">
            <i class="fas fa-arrow-up"></i> Bring to Front
        </div>
        <div class="context-menu-item" onclick="designer.sendToBack()">
            <i class="fas fa-arrow-down"></i> Send to Back
        </div>
        ` : ''}
    `;

        document.body.appendChild(contextMenu);
    }

    hideContextMenu() {
        const existingMenu = document.querySelector('.context-menu');
        if (existingMenu) {
            existingMenu.remove();
        }
    }

    deleteSelectedElement() {
        this.deleteSelectedElements();
    }

    deleteSelectedElements() {
        if (this.selectedElements.length > 0) {
            this.captureState(`Delete ${this.selectedElements.length} element(s)`);
            const idsToDelete = this.selectedElements.map(el => el.id);

            idsToDelete.forEach(id => {
                this.elements = this.elements.filter(el => el.id !== id);
                const elementDiv = document.getElementById(id);
                if (elementDiv) {
                    elementDiv.remove();
                }
            });

            this.deselectAll();
            this.saveToLocalStorage();
        }
        this.hideContextMenu();
    }

    duplicateSelectedElement() {
        this.duplicateSelectedElements();
    }

    duplicateSelectedElements() {
        if (this.selectedElements.length > 0) {
            const newElements = [];

            this.selectedElements.forEach(original => {
                const duplicate = {
                    ...JSON.parse(JSON.stringify(original)),
                    id: `element-${this.nextId++}`,
                    x: original.x + 20,
                    y: original.y + 20
                };
                this.elements.push(duplicate);
                this.renderElement(duplicate);
                newElements.push(duplicate);
            });

            // Select the duplicated elements
            this.deselectAll();
            newElements.forEach(el => this.addToSelection(el));
            this.selectedElement = newElements.length === 1 ? newElements[0] : null;
            this.showPropertiesPanel(this.selectedElement);

            this.saveToLocalStorage();
        }
        this.hideContextMenu();
    }

    bringToFront() {
        if (this.selectedElement) {
            const elementDiv = document.getElementById(this.selectedElement.id);
            if (elementDiv) {
                elementDiv.style.zIndex = '1000';
            }
        }
        this.hideContextMenu();
    }

    sendToBack() {
        if (this.selectedElement) {
            const elementDiv = document.getElementById(this.selectedElement.id);
            if (elementDiv) {
                elementDiv.style.zIndex = '0';
            }
        }
        this.hideContextMenu();
    }

    moveSelectedElementWithArrowKeys(e) {
        if (this.selectedElements.length === 0) return;

        // Add moving class for visual feedback to all selected elements
        this.selectedElements.forEach(element => {
            const elementDiv = document.getElementById(element.id);
            if (elementDiv) {
                elementDiv.classList.add('moving');
                setTimeout(() => {
                    elementDiv.classList.remove('moving');
                }, 150);
            }
        });

        let moveAmount = 1;

        if (e.shiftKey) {
            moveAmount = 10;
        }

        if (this.snapToGrid) {
            moveAmount = this.gridSize;
            if (e.shiftKey) {
                moveAmount = this.gridSize * 10;
            }
        }
        
        this.selectedElements.forEach(element => {
            let newX = element.x;
            let newY = element.y;

            const bounds = this.getElementBounds(element);

            switch (e.key) {
                case 'ArrowUp':
                    newY = Math.max(0, element.y - moveAmount);
                    break;
                case 'ArrowDown':
                    newY = Math.min(
                        this.canvas.offsetHeight - bounds.height,
                        element.y + moveAmount
                    );
                    break;
                case 'ArrowLeft':
                    newX = Math.max(0, element.x - moveAmount);
                    break;
                case 'ArrowRight':
                    newX = Math.min(
                        this.canvas.offsetWidth - bounds.width,
                        element.x + moveAmount
                    );
                    break;
            }

            if (newX !== element.x || newY !== element.y) {
                this.updateElementPosition(element.id, newX, newY);
            }
        });

        this.saveToLocalStorage();

        if (this.selectedElements.length === 1) {
            this.showPropertiesPanel(this.selectedElements[0]);
        }
    }

    // Keyboard shortcuts
    handleKeyboard(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        if (e.key === 'Delete' && this.selectedElements.length > 0) {
            this.deleteSelectedElements();
        } else if ((e.ctrlKey || e.metaKey) && e.key === 'd' && this.selectedElements.length > 0) {
            e.preventDefault();
            this.duplicateSelectedElements();
        } else if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
            e.preventDefault();
            this.selectAll();
        } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            this.saveTemplate();
        } else if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
            e.preventDefault();
            this.undo();
        } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
            e.preventDefault();
            this.redo();
        } else if (this.selectedElements.length > 0 && (e.key.startsWith('Arrow') || e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
            e.preventDefault();
            this.moveSelectedElementWithArrowKeys(e);
        } else if (e.key === 'Escape') {
            this.deselectAll();
        }
    }

    // Save/Load functionality
    saveToLocalStorage() {
        const template = {
            elements: this.elements,
            nextId: this.nextId,
            paperSize: document.getElementById('paperSize').value,
            showGrid: this.showGrid, // Save but don't load
            snapToGrid: this.snapToGrid // Save but don't load
        };
        localStorage.setItem('formDesignerTemplate', JSON.stringify(template));
    }

    loadFromLocalStorage() {
        const saved = localStorage.getItem('formDesignerTemplate');
        if (saved) {
            try {
                const template = JSON.parse(saved);
                this.elements = template.elements || [];
                this.nextId = template.nextId || 1;

                if (template.paperSize) {
                    document.getElementById('paperSize').value = template.paperSize;
                    this.applyPaperSize(template.paperSize);
                }

                // Ignore any saved grid/snap settings
                this.showGrid = false;
                this.snapToGrid = false;

                this.renderAllElements();
            } catch (e) {
                console.error('Error loading template:', e);
            }
        }
        // Ensure grid visibility is updated
        this.updateGridVisibility();
    }

    renderAllElements() {
        // Clear existing elements
        document.querySelectorAll('.design-element').forEach(el => el.remove());

        // Render all elements
        this.elements.forEach(element => {
            this.renderElement(element);
        });
    }

    saveTemplate() {
        this.saveToLocalStorage();
        alert('Template saved successfully!');
    }

    clearCanvas() {
        if (confirm('Are you sure you want to clear the canvas? This cannot be undone.')) {
            this.elements = [];
            this.nextId = 1;
            this.deselectAll();
            this.renderAllElements();
            localStorage.removeItem('formDesignerTemplate');
        }
    }

    // Export functionality
    exportAsHTML() {
        const htmlContent = this.generateHTML();
        this.downloadFile(htmlContent, 'form-template.html', 'text/html');
    }

    exportAsJSON() {
        const template = {
            elements: this.elements,
            nextId: this.nextId,
            paperSize: document.getElementById('paperSize').value,
            version: '1.0',
            exportedAt: new Date().toISOString()
        };

        const jsonContent = JSON.stringify(template, null, 2);
        this.downloadFile(jsonContent, 'form-template.json', 'application/json');
    }

    printForm() {
        const htmlContent = this.generateHTML();
        const printWindow = window.open('', '_blank');
        printWindow.document.write(htmlContent);
        printWindow.document.close();

        printWindow.onload = function () {
            printWindow.focus();
            printWindow.print();
            printWindow.close();
        };
    }

    generateHTML() {
        const paperClass = this.canvas.className.includes('a4-paper') ? 'a4-paper' :
            this.canvas.className.includes('letter-paper') ? 'letter-paper' : 'legal-paper';

        let elementsHTML = '';
        this.elements.forEach(element => {
            elementsHTML += this.generateElementHTML(element);
        });

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <meta name="pdfkit-page_size" content="${paperClass === 'a4-paper' ? 'A4' : paperClass === 'legal-paper' ? 'Legal' : 'Letter'}"/>
                <meta name="pdfkit-orientation" content="Portrait"/>
                <title>Form Template</title>
                <style>
                    @page {
                        margin: 0;
                    }
                    * { 
                        box-sizing: border-box; 
                        margin: 0;
                        padding: 0;
                    }
                    body { 
                        margin: 0; 
                        padding: 0;
                        font-family: Arial, sans-serif;
                    }
                    .form-container { 
                        background: white; 
                        position: relative;
                        margin: 0 auto;
                        page-break-after: avoid;
                        page-break-inside: avoid;
                        border: 1px solid #ddd;
                    }
                    .a4-paper { 
                        width: 210mm; 
                        height: 297mm; 
                        min-height: 297mm; 
                    }
                    .letter-paper { 
                        width: 216mm; 
                        height: 279mm; 
                        min-height: 279mm; 
                    }
                    .legal-paper { 
                        width: 216mm; 
                        height: 356mm; 
                        min-height: 356mm; 
                    }
                    ${this.generateElementCSS()}
                </style>
            </head>
            <body>
                <div class="form-container ${paperClass}">
                    ${elementsHTML}
                </div>
            </body>
            </html>`;
    }

    generateElementHTML(element) {
        const { type, x, y, width, height, properties } = element;
        // Use custom ID if set, otherwise fall back to internal ID
        const elementId = properties.elementId || element.id;
        const idAttr = ` id="${elementId}"`;

        switch (type) {
            case 'text-field':
                return `<div${idAttr} class="text-field-element" style="position: absolute; left: ${x}px; top: ${y}px; width: ${width}px; height: ${height}px; font-size: ${properties.fontSize}pt; color: ${properties.color}; text-align: ${properties.textAlign}; font-weight: ${properties.fontWeight}; padding: 4px 8px; line-height: ${Math.max(height - 8, 12)}px; overflow: hidden;">${properties.text || 'Text Field'}</div>`;

            case 'rectangle':
                return `<div${idAttr} class="rectangle-element" style="position: absolute; left: ${x}px; top: ${y}px; width: ${width}px; height: ${height}px; background: ${properties.fillColor}; border: ${properties.borderWidth}px solid ${properties.borderColor};"></div>`;

            case 'vline':
                return `<div${idAttr} class="vline-element" style="position: absolute; left: ${x}px; top: ${y}px; width: ${properties.thickness}px; height: ${height}px; border-left: ${properties.thickness}px solid ${properties.color}; background: transparent;"></div>`;

            case 'hline':
                return `<div${idAttr} class="hline-element" style="position: absolute; left: ${x}px; top: ${y}px; width: ${width}px; height: ${properties.thickness}px; border-top: ${properties.thickness}px solid ${properties.color}; background: transparent;"></div>`;

            case 'table':
                const fontSize = properties.fontSize || 12;
                const rowHeight = properties.rowHeight || 30; // Make sure to get rowHeight
                const showBorders = properties.showBorders !== false;
                const borderWidth = showBorders ? (properties.borderWidth || 1) : 0;
                const borderColor = properties.borderColor || '#34495e';

                let tableHTML = `<div${idAttr} class="table-element" style="position: absolute; left: ${x}px; top: ${y}px; width: ${width}px; ${showBorders ? `border: ${borderWidth}px solid ${borderColor};` : 'border: none;'}">`;

                // Header row - ADD EXPLICIT HEIGHT AND BORDER BOTTOM
                if (properties.showHeader !== false) {
                    const headerBorderBottom = showBorders ? `border-bottom: ${borderWidth}px solid ${borderColor};` : 'border: none;';
                    tableHTML += '<div class="table-row table-header" style="height: ' + rowHeight + 'px; line-height: ' + rowHeight + 'px; ' + headerBorderBottom + '">';
                    properties.headers.forEach((header, index) => {
                        const isLastCell = index === properties.columns - 1;
                        const borderRight = showBorders && !isLastCell ? `border-right: ${borderWidth}px solid ${borderColor};` : 'border: none;';
                        tableHTML += `<div class="table-cell" style="width: ${properties.columnWidths[index]}%; font-size: ${fontSize}pt; height: ${rowHeight}px; line-height: ${rowHeight}px; ${borderRight}">${header}</div>`;
                    });
                    tableHTML += '<div style="clear: both;"></div></div>';
                }

                // Data rows - KEEP EXISTING HEIGHT (now consistent with header)
                const startRow = properties.showHeader !== false ? 1 : 0;
                const totalRows = properties.showHeader !== false ? properties.rows : properties.rows + 1;

                for (let i = startRow; i < totalRows; i++) {
                    const isLastRow = i === totalRows - 1;
                    const borderBottom = showBorders && !isLastRow ? `border-bottom: ${borderWidth}px solid ${borderColor};` : 'border: none;';
                    tableHTML += `<div class="table-row" style="${borderBottom} height: ${rowHeight}px; line-height: ${rowHeight}px;">`;
                    for (let j = 0; j < properties.columns; j++) {
                        const isLastCell = j === properties.columns - 1;
                        const borderRight = showBorders && !isLastCell ? `border-right: ${borderWidth}px solid ${borderColor};` : 'border: none;';
                        tableHTML += `<div class="table-cell" style="width: ${properties.columnWidths[j]}%; font-size: ${fontSize}pt; height: ${rowHeight}px; line-height: ${rowHeight}px; ${borderRight}">&nbsp;</div>`;
                    }
                    tableHTML += '<div style="clear: both;"></div></div>';
                }
                tableHTML += '</div>';
                return tableHTML;

            case 'label':
                return `<div${idAttr} class="label-element" style="position: absolute; left: ${x}px; top: ${y}px; width: ${width}px; height: ${height}px; font-size: ${properties.fontSize}pt; color: ${properties.color}; text-align: ${properties.textAlign}; font-weight: ${properties.fontWeight}; padding: 4px 8px; line-height: ${Math.max(height - 8, 12)}px; overflow: hidden;">${properties.text}</div>`;

            case 'checkbox':
                const checkboxSize = properties.checkboxSize || 16;
                const labelGap = properties.labelGap || 8;
                const labelPosition = properties.labelPosition || 'right';
                const checkfontSize = properties.fontSize || 14;

                if (labelPosition === 'right') {
                    return `<div${idAttr} class="checkbox-element" style="position: absolute; left: ${x}px; top: ${y}px; width: ${width}px; height: ${height}px; line-height: 1; white-space: nowrap;">
                        <input type="checkbox" style="display: inline-block; vertical-align: middle; margin: 0 ${labelGap}px 0 0; width: ${checkboxSize}px; height: ${checkboxSize}px;">
                        <span class="checkbox-label" style="display: inline-block; vertical-align: middle; font-size: ${checkfontSize}pt; color: #2c3e50;">${properties.text}</span>
                    </div>`;
                } else {
                    return `<div${idAttr} class="checkbox-element" style="position: absolute; left: ${x}px; top: ${y}px; width: ${width}px; height: ${height}px; line-height: 1; white-space: nowrap;">
                        <span class="checkbox-label" style="display: inline-block; vertical-align: middle; font-size: ${checkfontSize}pt; color: #2c3e50; margin: 0 ${labelGap}px 0 0;">${properties.text}</span>
                        <input type="checkbox" style="display: inline-block; vertical-align: middle; margin: 0; width: ${checkboxSize}px; height: ${checkboxSize}px;">
                    </div>`;
                }

            case 'signature':
                const paddingTop = Math.max(10, Math.floor(height / 3));
                return `<div${idAttr} class="signature-element" style="position: absolute; left: ${x}px; top: ${y}px; width: ${width}px; height: ${height}px; border: 1px dashed ${properties.borderColor}; color: ${properties.color}; text-align: center; padding-top: ${paddingTop}px; font-style: italic;">${properties.text}</div>`;

            default:
                return '';
        }
    }

    generateElementCSS() {
        return `
        .text-field-element { 
            background: transparent;
            overflow: hidden;
        }
        .rectangle-element { 
            background: transparent; 
        }
        .vline-element { 
            background: transparent; 
        }
        .hline-element { 
            background: transparent; 
        }
        
        /* Table Styles - Rotativa Compatible (No Flexbox) */
        .table-element {
            border: 1px dashed #95a5a6;
            background: white;
            display: block;
            height: auto !important;
            min-height: 30px;
            overflow: hidden;
        }

            .table-element[style*="border-style: solid"],
            .table-element[style*="border-width:"] {
                border-style: solid !important;
            }

        .table-row {
            display: block;
            min-height: 10px;
            width: 100%;
            overflow: hidden;
            height: auto !important;
        }

            .table-row:after {
                content: "";
                display: table;
                clear: both;
            }

            .table-row:last-child {
                border-bottom: none;
            }

        .table-cell {
            min-height: 20px;
            position: relative;
            line-height: 1.2;
            vertical-align: middle;
            float: left;
            box-sizing: border-box;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            height: inherit !important;
        }

            .table-cell:last-child {
                border-right: none;
            }
        
        /* Checkbox styles - No Flexbox */
        .checkbox-element {
            display: block;
            padding: 4px 8px;
            background: transparent;
            line-height: 1;
            white-space: nowrap;
        }

            .checkbox-element input[type="checkbox"] {
                display: inline-block;
                vertical-align: middle;
            }

            .checkbox-element .checkbox-label {
                display: inline-block;
                vertical-align: middle;
                line-height: 1;
            }

        
        /* Signature styles - No Flexbox */
        .signature-element { 
            text-align: center !important;
            font-style: italic !important;
            overflow: hidden;
        }
        
        /* Label styles */
        .label-element {
            background: transparent;
            overflow: hidden;
        }
        
        /* Print specific styles */
        @media print {
            body {
                background: white !important;
            }
            .form-container {
                box-shadow: none !important;
                page-break-inside: avoid;
            }
            .vline-element {
                background: transparent !important;
            }
            .hline-element {
                background: transparent !important;
            }
        }
    `;
    }

    // Capture current state for undo/redo
    captureState(actionName = 'Action') {
        const state = {
            elements: JSON.parse(JSON.stringify(this.elements)),
            nextId: this.nextId,
            selectedElements: this.selectedElements.map(el => el.id),
            action: actionName,
            timestamp: Date.now()
        };

        this.undoStack.push(state);

        // Limit stack size
        if (this.undoStack.length > this.maxHistorySteps) {
            this.undoStack.shift();
        }

        // Clear redo stack when new action is performed
        this.redoStack = [];

        //console.log(`State captured: ${actionName} (${this.undoStack.length} in stack)`);
    }

    // Restore state from snapshot
    restoreState(state) {
        this.elements = state.elements;
        this.nextId = state.nextId;

        // Restore selection
        this.deselectAll();
        state.selectedElements.forEach(id => {
            const element = this.getElementById(id);
            if (element) {
                this.addToSelection(element);
            }
        });

        this.renderAllElements();
        this.showPropertiesPanel(this.selectedElements.length === 1 ? this.selectedElements[0] : null);
    }

    // Undo last action
    undo() {
        if (this.undoStack.length === 0) {
            console.log('Nothing to undo');
            return;
        }

        const currentState = {
            elements: JSON.parse(JSON.stringify(this.elements)),
            nextId: this.nextId,
            selectedElements: this.selectedElements.map(el => el.id),
            action: 'Current',
            timestamp: Date.now()
        };

        const previousState = this.undoStack.pop();
        this.redoStack.push(currentState);

        this.restoreState(previousState);
        this.saveToLocalStorage();

        console.log(`Undo: ${previousState.action}`);
        this.showNotification(`Undo: ${previousState.action}`);
    }

    // Redo last undone action
    redo() {
        if (this.redoStack.length === 0) {
            console.log('Nothing to redo');
            return;
        }

        const currentState = {
            elements: JSON.parse(JSON.stringify(this.elements)),
            nextId: this.nextId,
            selectedElements: this.selectedElements.map(el => el.id),
            action: 'Current',
            timestamp: Date.now()
        };

        const nextState = this.redoStack.pop();
        this.undoStack.push(currentState);

        this.restoreState(nextState);
        this.saveToLocalStorage();

        console.log(`Redo: ${nextState.action}`);
        this.showNotification(`Redo: ${nextState.action}`);
    }

    showNotification(message) {
        // Create or update notification element
        let notification = document.getElementById('undoRedoNotification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'undoRedoNotification';
            notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #2c3e50;
            color: white;
            padding: 10px 15px;
            border-radius: 4px;
            z-index: 10000;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 14px;
            opacity: 0;
            transition: opacity 0.3s;
        `;
            document.body.appendChild(notification);
        }

        notification.textContent = message;
        notification.style.opacity = '1';

        setTimeout(() => {
            notification.style.opacity = '0';
        }, 2000);
    }

    importTemplate(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const content = event.target.result;

                if (file.name.endsWith('.html')) {
                    this.importFromHTML(content);
                } else if (file.name.endsWith('.json')) {
                    const template = JSON.parse(content);
                    this.elements = template.elements || [];
                    this.nextId = template.nextId || 1;

                    if (template.paperSize) {
                        document.getElementById('paperSize').value = template.paperSize;
                        this.applyPaperSize(template.paperSize);
                    }

                    this.renderAllElements();
                    this.deselectAll();
                    this.saveToLocalStorage();
                    alert('Template imported successfully!');
                }
            } catch (error) {
                console.error('Error importing template:', error);
                alert('Error importing template. Please check the file format.');
            }
        };
        reader.readAsText(file);

        // Reset file input
        e.target.value = '';
    }

    importFromHTML(htmlContent) {
        // Simple HTML import - in a real application, you'd want more robust parsing
        alert('HTML import would need custom implementation based on your exported structure');
    }

    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// Initialize the designer when the page loads
let designer;
document.addEventListener('DOMContentLoaded', () => {
    designer = new FormDesigner();
});
