document.addEventListener('DOMContentLoaded', function () {
    class TemplateDesigner {
        constructor() {
            this.dragEnabled = false;
            this.snapToGrid = true;
            this.gridSize = 10;
            this.selectedField = null;
            this.fieldCounter = 0;
            this.zoomLevel = 1;
            this.history = [];
            this.historyIndex = -1;
            this.hasUnsavedChanges = false; 

            this.init();
        }

        init() {
            this.bindEvents();
            this.setupDragAndDrop();
            this.updateFieldList();
            this.updateCanvasSize();
            this.saveState();
            this.setupBeforeUnloadWarning();
        }

        bindEvents() {
            // Toolbar buttons
            document.getElementById('toggleDragBtn').addEventListener('click', () => this.toggleDragMode());
            document.getElementById('toggleGridBtn').addEventListener('click', () => this.toggleGrid());
            document.getElementById('addFieldBtn').addEventListener('click', () => this.addField());
            document.getElementById('addLabelBtn').addEventListener('click', () => this.addLabel());
            document.getElementById('toggleLabelsBtn').addEventListener('click', () => this.toggleLabels());
            document.getElementById('addRectangleBtn').addEventListener('click', () => this.addRectangle());
            document.getElementById('addLineBtn').addEventListener('click', () => this.addLine());

            // Canvas size controls
            document.getElementById('sizePreset').addEventListener('change', (e) => this.setSizePreset(e.target.value));
            document.getElementById('canvasWidth').addEventListener('input', () => this.updateCanvasSize());
            document.getElementById('canvasHeight').addEventListener('input', () => this.updateCanvasSize());

            // Export buttons
            document.getElementById('downloadHtmlBtn').addEventListener('click', () => this.downloadHtml());
            document.getElementById('copyCssBtn').addEventListener('click', () => this.copyCss());
            document.getElementById('downloadPdfBtn').addEventListener('click', () => this.downloadPdf());

            // Import template
            document.getElementById('uploadTemplateInput').addEventListener('change', (e) => this.loadHtmlTemplate(e));

            // Zoom controls
            document.getElementById('zoomInBtn').addEventListener('click', () => this.zoom(1.2));
            document.getElementById('zoomOutBtn').addEventListener('click', () => this.zoom(0.8));
            document.getElementById('fitToPageBtn').addEventListener('click', () => this.fitToPage());

            // Field selection
            document.addEventListener('click', (e) => this.handleFieldSelection(e));

            // Keyboard shortcuts
            document.addEventListener('keydown', (e) => this.handleKeyboard(e));

            // Mouse tracking
            document.getElementById('formWrapper').addEventListener('mousemove', (e) => this.updateMousePosition(e));
        }

        setupBeforeUnloadWarning() {
            window.addEventListener('beforeunload', (e) => {
                if (this.hasUnsavedChanges) {
                    e.preventDefault();
                    e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
                    return e.returnValue;
                }
            });
        }

        resetUnsavedChanges() {
            this.hasUnsavedChanges = false;
        }

        toggleDragMode() {
            this.dragEnabled = !this.dragEnabled;
            const btn = document.getElementById('toggleDragBtn');
            btn.textContent = this.dragEnabled ? 'Disable Drag' : 'Enable Drag';
            btn.className = this.dragEnabled ? 'btn btn-danger' : 'btn btn-secondary';
            this.updateStatus(this.dragEnabled ? 'Drag mode enabled' : 'Drag mode disabled');
        }

        toggleGrid() {
            const formWrapper = document.getElementById('formWrapper');
            formWrapper.classList.toggle('grid-bg');
            const btn = document.getElementById('toggleGridBtn');
            btn.textContent = formWrapper.classList.contains('grid-bg') ? 'Hide Grid' : 'Show Grid';
        }

        setSizePreset(preset) {
            if (preset === 'custom') return;

            const [width, height] = preset.split('x').map(Number);
            document.getElementById('canvasWidth').value = width;
            document.getElementById('canvasHeight').value = height;
            this.updateCanvasSize();
        }

        toggleLabels() {
            const wrapper = document.getElementById('formWrapper');
            const btn = document.getElementById('toggleLabelsBtn');
            const isHiding = wrapper.classList.toggle('hide-labels');

            btn.textContent = isHiding ? 'Show Labels' : 'Hide Labels';
            this.updateStatus(isHiding ? 'Labels hidden' : 'Labels visible');
        }

        updateCanvasSize() {
            const width = parseFloat(document.getElementById('canvasWidth').value);
            const height = parseFloat(document.getElementById('canvasHeight').value);
            const formWrapper = document.getElementById('formWrapper');

            formWrapper.style.width = `${width}in`;
            formWrapper.style.height = `${height}in`;

            this.updateStatus(`Canvas size: ${width}" � ${height}"`);
        }

        addRectangle() {
            const nextNum = this.getNextFieldNumber('rectangle');
            this.fieldCounter = Math.max(this.fieldCounter, nextNum);

            const rect = document.createElement('div');
            rect.className = 'field label draggable shape rectangle';
            rect.classList.add(`field-rectangle-${this.fieldCounter}`);
            rect.style.top = '50px';
            rect.style.left = '50px';
            rect.style.width = '100px';
            rect.style.height = '60px';
            rect.style.backgroundColor = 'transparent';
            rect.style.border = '1px solid #000';
            rect.style.borderRadius = '0px';

            // Add resize handles
            this.addResizeHandles(rect);

            document.getElementById('formWrapper').appendChild(rect);
            this.setupShapeEvents(rect);
            this.updateFieldList();
            this.selectField(rect);
            this.saveState();
        }

        addLine() {
            const nextNum = this.getNextFieldNumber('line');
            this.fieldCounter = Math.max(this.fieldCounter, nextNum);

            const line = document.createElement('div');
            line.className = 'field label draggable line';
            line.classList.add(`field-line-${this.fieldCounter}`);
            line.style.top = '50px';
            line.style.left = '50px';
            line.style.width = '100px';
            line.style.height = '0px'; // Height is now 0 since we're using border
            line.style.borderTop = '1px solid #000'; // Use border-top instead of background
            line.style.backgroundColor = 'transparent'; // Ensure no background
            line.style.transformOrigin = '0 0';

            // Create endpoints
            const startPoint = document.createElement('div');
            startPoint.className = 'line-endpoint start-point';
            startPoint.style.position = 'absolute';
            startPoint.style.width = '10px';
            startPoint.style.height = '10px';
            startPoint.style.borderRadius = '50%';
            startPoint.style.backgroundColor = '#007bff';
            startPoint.style.left = '-5px';
            startPoint.style.top = '-5px';
            startPoint.style.cursor = 'move';
            startPoint.style.zIndex = '10';

            const endPoint = document.createElement('div');
            endPoint.className = 'line-endpoint end-point';
            endPoint.style.position = 'absolute';
            endPoint.style.width = '10px';
            endPoint.style.height = '10px';
            endPoint.style.borderRadius = '50%';
            endPoint.style.backgroundColor = '#007bff';
            endPoint.style.right = '-5px';
            endPoint.style.bottom = '-5px';
            endPoint.style.cursor = 'move';
            endPoint.style.zIndex = '10';

            // Create rotate handle
            const rotateHandle = document.createElement('div');
            rotateHandle.className = 'rotate-handle';
            rotateHandle.title = 'Rotate 90°';

            line.appendChild(startPoint);
            line.appendChild(endPoint);
            line.appendChild(rotateHandle);

            startPoint.style.display = 'none';
            endPoint.style.display = 'none';
            rotateHandle.style.display = 'none';

            document.getElementById('formWrapper').appendChild(line);
            this.setupLineEvents(line);
            this.updateFieldList();
            this.selectField(line);
            this.saveState();
        }

        addResizeHandles(element) {
            const positions = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];

            positions.forEach(pos => {
                const handle = document.createElement('div');
                handle.className = `resize-handle ${pos}`;
                handle.style.display = 'none';
                element.appendChild(handle);
            });

            this.setupResizeEvents(element);
        }

        setupResizeEvents(element) {
            const handles = element.querySelectorAll('.resize-handle');

            handles.forEach(handle => {
                handle.addEventListener('mousedown', (e) => {
                    e.stopPropagation();
                    this.startResizing(element, e, handle.classList.contains('top-left'),
                        handle.classList.contains('top-right'),
                        handle.classList.contains('bottom-left'),
                        handle.classList.contains('bottom-right'));
                });
            });
        }

        startResizing(element, e, isTopLeft, isTopRight, isBottomLeft, isBottomRight) {
            e.preventDefault();

            const startX = e.clientX;
            const startY = e.clientY;
            const startWidth = parseInt(element.style.width);
            const startHeight = parseInt(element.style.height);
            const startLeft = parseInt(element.style.left);
            const startTop = parseInt(element.style.top);

            const onMouseMove = (moveEvent) => {
                const dx = moveEvent.clientX - startX;
                const dy = moveEvent.clientY - startY;

                if (isTopLeft) {
                    element.style.width = (startWidth - dx) + 'px';
                    element.style.height = (startHeight - dy) + 'px';
                    element.style.left = (startLeft + dx) + 'px';
                    element.style.top = (startTop + dy) + 'px';
                } else if (isTopRight) {
                    element.style.width = (startWidth + dx) + 'px';
                    element.style.height = (startHeight - dy) + 'px';
                    element.style.top = (startTop + dy) + 'px';
                } else if (isBottomLeft) {
                    element.style.width = (startWidth - dx) + 'px';
                    element.style.height = (startHeight + dy) + 'px';
                    element.style.left = (startLeft + dx) + 'px';
                } else { // bottom-right
                    element.style.width = (startWidth + dx) + 'px';
                    element.style.height = (startHeight + dy) + 'px';
                }
            };

            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                this.saveState();
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        }

        setupShapeEvents(shape) {
            this.setupFieldEvents(shape);

            shape.addEventListener('dblclick', () => {
                if (!this.dragEnabled) {
                    this.selectField(shape);
                }
            });
        }

        setupLineEvents(line) {
            const startPoint = line.querySelector('.start-point');
            const endPoint = line.querySelector('.end-point');
            const rotateHandle = line.querySelector('.rotate-handle');

            // Helper function to get current rotation angle in radians
            const getRotationAngle = () => {
                const transform = line.style.transform || '';
                const match = transform.match(/rotate\((\d+)deg\)/);
                return match ? parseInt(match[1]) * Math.PI / 180 : 0;
            };

            // Line movement (when dragging the line itself)
            line.addEventListener('mousedown', (e) => {
                if (!this.dragEnabled || e.target !== line) return;
                e.preventDefault();

                const startX = e.clientX;
                const startY = e.clientY;
                const startLeft = parseInt(line.style.left);
                const startTop = parseInt(line.style.top);

                const onMouseMove = (moveEvent) => {
                    const dx = moveEvent.clientX - startX;
                    const dy = moveEvent.clientY - startY;

                    line.style.left = (startLeft + dx) + 'px';
                    line.style.top = (startTop + dy) + 'px';
                };

                const onMouseUp = () => {
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                    this.saveState();
                };

                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            });

            // Start point movement - accounts for rotation
            startPoint.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                e.preventDefault();

                const startX = e.clientX;
                const startY = e.clientY;
                const angle = getRotationAngle();
                const cosAngle = Math.cos(angle);
                const sinAngle = Math.sin(angle);

                const startLeft = parseInt(line.style.left);
                const startTop = parseInt(line.style.top);
                const startWidth = parseInt(line.style.width);
                const startHeight = parseInt(line.style.height);

                const onMouseMove = (moveEvent) => {
                    const dx = moveEvent.clientX - startX;
                    const dy = moveEvent.clientY - startY;

                    // Rotate the mouse movement to match line orientation
                    const rotatedDx = dx * cosAngle + dy * sinAngle;
                    const rotatedDy = -dx * sinAngle + dy * cosAngle;

                    // Calculate new position and dimensions
                    const newLeft = startLeft + rotatedDx;
                    const newTop = startTop + rotatedDy;
                    const newWidth = Math.max(1, startWidth - rotatedDx);
                    const newHeight = Math.max(1, startHeight - rotatedDy);

                    // Update line position and dimensions
                    line.style.left = newLeft + 'px';
                    line.style.top = newTop + 'px';
                    line.style.width = newWidth + 'px';
                    line.style.height = newHeight + 'px';
                };

                const onMouseUp = () => {
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                    this.saveState();
                };

                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            });

            // End point movement - accounts for rotation
            endPoint.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                e.preventDefault();

                const startX = e.clientX;
                const startY = e.clientY;
                const angle = getRotationAngle();
                const cosAngle = Math.cos(angle);
                const sinAngle = Math.sin(angle);

                const startWidth = parseInt(line.style.width);
                const startHeight = parseInt(line.style.height);

                const onMouseMove = (moveEvent) => {
                    const dx = moveEvent.clientX - startX;
                    const dy = moveEvent.clientY - startY;

                    // Rotate the mouse movement to match line orientation
                    const rotatedDx = dx * cosAngle + dy * sinAngle;
                    const rotatedDy = -dx * sinAngle + dy * cosAngle;

                    // Calculate new dimensions
                    const newWidth = Math.max(1, startWidth + rotatedDx);
                    const newHeight = Math.max(1, startHeight + rotatedDy);

                    // Update line dimensions (position stays the same)
                    line.style.width = newWidth + 'px';
                    line.style.height = newHeight + 'px';
                };

                const onMouseUp = () => {
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                    this.saveState();
                };

                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            });

            // Rotate handle
            rotateHandle.addEventListener('click', (e) => {
                e.stopPropagation();
                const currentTransform = line.style.transform || 'rotate(0deg)';
                const currentAngle = parseInt(currentTransform.match(/rotate\((\d+)deg\)/)[1]) || 0;
                const newAngle = (currentAngle + 90) % 360;
                line.style.transform = `rotate(${newAngle}deg)`;
                this.saveState();
            });

            line.addEventListener('dblclick', () => {
                if (!this.dragEnabled) {
                    this.selectField(line);
                }
            });
        }

        addField() {
            const nextNum = this.getNextFieldNumber('custom');
            this.fieldCounter = Math.max(this.fieldCounter, nextNum);

            const field = document.createElement('div');
            field.className = 'field draggable';
            field.classList.add(`field-custom-${this.fieldCounter}`);
            field.textContent = `Field ${this.fieldCounter}`;
            field.style.top = '50px';
            field.style.left = '50px';
            field.contentEditable = true;

            document.getElementById('formWrapper').appendChild(field);
            this.setupFieldEvents(field);
            this.updateFieldList();
            this.selectField(field);
            this.saveState();
        }

        addLabel() {
            const nextNum = this.getNextFieldNumber('label');
            this.fieldCounter = Math.max(this.fieldCounter, nextNum);

            const label = document.createElement('div');
            label.className = 'field draggable label';
            label.classList.add(`field-label-${this.fieldCounter}`);
            label.textContent = `Label ${this.fieldCounter}`;
            label.style.top = '50px';
            label.style.left = '50px';
            label.contentEditable = true;
            label.style.padding = '0px 1px';

            document.getElementById('formWrapper').appendChild(label);
            this.setupFieldEvents(label);
            this.updateFieldList();
            this.selectField(label);
            this.saveState();
        }

        setupDragAndDrop() {
            let offsetX, offsetY, dragged;

            document.querySelectorAll('.draggable').forEach(el => {
                this.setupFieldEvents(el);
            });
        }

        setupFieldEvents(field) {
            field.addEventListener('mousedown', (e) => {
                if (!this.dragEnabled) return;
                e.preventDefault();

                this.dragged = field;
                field.classList.add('dragging');

                const rect = field.getBoundingClientRect();
                const parentRect = document.getElementById('formWrapper').getBoundingClientRect();

                this.offsetX = e.clientX - rect.left;
                this.offsetY = e.clientY - rect.top;

                document.addEventListener('mousemove', this.onMouseMove.bind(this));
                document.addEventListener('mouseup', this.onMouseUp.bind(this));
            });

            field.addEventListener('dblclick', () => {
                if (!this.dragEnabled) {
                    field.contentEditable = true;
                    field.focus();
                    this.selectTextContent(field);
                }
            });

            field.addEventListener('blur', () => {
                field.contentEditable = false;
                this.updateFieldList();
                this.saveState();
            });

            field.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    field.blur();
                }
            });
        }

        onMouseMove(e) {
            if (!this.dragged) return;

            const parentRect = document.getElementById('formWrapper').getBoundingClientRect();
            let x = e.clientX - parentRect.left - this.offsetX;
            let y = e.clientY - parentRect.top - this.offsetY;

            if (this.snapToGrid) {
                x = Math.round(x / this.gridSize) * this.gridSize;
                y = Math.round(y / this.gridSize) * this.gridSize;
            }

            // Boundaries
            x = Math.max(0, Math.min(x, parentRect.width - this.dragged.offsetWidth));
            y = Math.max(0, Math.min(y, parentRect.height - this.dragged.offsetHeight));

            this.dragged.style.left = `${x}px`;
            this.dragged.style.top = `${y}px`;

            this.updatePositionInfo(x, y);
            this.showGuidelines(x, y);
        }

        onMouseUp() {
            if (this.dragged) {
                this.dragged.classList.remove('dragging');
                this.hideGuidelines();
                this.saveState();
            }

            document.removeEventListener('mousemove', this.onMouseMove.bind(this));
            document.removeEventListener('mouseup', this.onMouseUp.bind(this));
            this.dragged = null;
        }

        showGuidelines(x, y) {
            this.hideGuidelines();

            const formWrapper = document.getElementById('formWrapper');
            const fields = formWrapper.querySelectorAll('.field:not(.dragging)');

            fields.forEach(field => {
                const fieldRect = field.getBoundingClientRect();
                const parentRect = formWrapper.getBoundingClientRect();

                const fieldX = fieldRect.left - parentRect.left;
                const fieldY = fieldRect.top - parentRect.top;

                const tolerance = 5;

                if (Math.abs(x - fieldX) < tolerance) {
                    this.createGuideline('vertical', fieldX);
                }

                if (Math.abs(y - fieldY) < tolerance) {
                    this.createGuideline('horizontal', fieldY);
                }
            });
        }

        createGuideline(type, position) {
            const guideline = document.createElement('div');
            guideline.className = `guideline guideline-${type.charAt(0)}`;
            guideline.style[type === 'vertical' ? 'left' : 'top'] = `${position}px`;

            document.getElementById('formWrapper').appendChild(guideline);
        }

        hideGuidelines() {
            document.querySelectorAll('.guideline').forEach(el => el.remove());
        }

        handleFieldSelection(e) {
            if (e.target.classList.contains('field')) {
                this.selectField(e.target);
            } else if (!e.target.closest('.properties-panel')) {
                this.selectField(null);
            }
        }

        selectField(field) {
            document.querySelectorAll('.field.selected').forEach(el => el.classList.remove('selected'));
            document.querySelectorAll('.resize-handle').forEach(h => h.style.display = 'none');
            document.querySelectorAll('.line-endpoint').forEach(p => p.style.display = 'none');
            document.querySelectorAll('.rotate-handle').forEach(r => r.style.display = 'none');

            this.selectedField = field;

            if (field) {
                field.classList.add('selected');
                this.showProperties(field);
            } else {
                this.hideProperties();
            }

            if (field && field.classList.contains('shape')) {
                field.querySelectorAll('.resize-handle').forEach(h => h.style.display = 'block');
            }

            if (field && field.classList.contains('line')) {
                field.querySelectorAll('.line-endpoint').forEach(p => p.style.display = 'block');
                field.querySelector('.rotate-handle').style.display = 'block';
            }

            this.updateFieldList();
        }

        showProperties(field) {
            const content = document.getElementById('propertiesContent');
            const style = getComputedStyle(field);

            let textProps = '';
            let shapeProps = '';
            let lineProps = '';

            if (field.classList.contains('label') || field.classList.contains('field') && !field.classList.contains('shape') && !field.classList.contains('line')) {
                textProps = `
                    <div class="form-group">
                        <label>Text</label>
                        <input type="text" class="form-control" id="propText" value="${field.textContent}">
                    </div>
                    <div class="form-group">
                        <label>Text Alignment</label>
                        <div class="alignment-buttons">
                            <button class="btn btn-secondary ${style.textAlign === 'left' ? 'active' : ''}" id="alignLeft">Left</button>
                            <button class="btn btn-secondary ${style.textAlign === 'center' ? 'active' : ''}" id="alignCenter">Center</button>
                            <button class="btn btn-secondary ${style.textAlign === 'right' ? 'active' : ''}" id="alignRight">Right</button>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Font Size (px)</label>
                        <input type="number" class="form-control" id="propFontSize" value="${parseInt(style.fontSize)}" min="6" max="72">
                    </div>
                    <div class="form-group">
                        <label>Font Weight</label>
                        <select class="form-control" id="propFontWeight">
                            <option value="normal" ${style.fontWeight === 'normal' ? 'selected' : ''}>Normal</option>
                            <option value="bold" ${style.fontWeight === 'bold' ? 'selected' : ''}>Bold</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Text Decoration</label>
                        <select class="form-control" id="propTextDecoration">
                            <option value="none" ${style.textDecoration === 'none' ? 'selected' : ''}>None</option>
                            <option value="underline" ${style.textDecoration.includes('underline') ? 'selected' : ''}>Underline</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Text Color</label>
                        <input type="color" class="color-picker" id="propTextColor" value="${this.rgbToHex(style.color)}">
                    </div>
                `;
            }

            if (field.classList.contains('shape')) {
                shapeProps = `
                    <div class="form-group">
                        <label>Border Width (px)</label>
                        <input type="number" class="form-control" id="propBorderWidth" value="${parseInt(style.borderWidth)}" min="0" max="10">
                    </div>
                    <div class="form-group">
                        <label>Border Color</label>
                        <input type="color" class="color-picker" id="propBorderColor" value="${this.rgbToHex(style.borderColor)}">
                    </div>
                `;
            }

            if (field.classList.contains('line')) {
                lineProps = `
                    <div class="form-group">
                        <label>Line Thickness (px)</label>
                        <input type="number" class="form-control" id="propLineThickness" 
                               value="${parseInt(style.borderTopWidth) || 2}" min="1" max="20">
                    </div>
                    <div class="form-group">
                        <label>Line Color</label>
                        <input type="color" class="color-picker" id="propLineColor" 
                               value="${this.rgbToHex(style.borderTopColor) || '#000000'}">
                    </div>
                `;
            }

            content.innerHTML = `
                <div class="form-group">
                    <label>Element Type</label>
                    <input type="text" class="form-control" id="propElementType" 
                           value="${field.classList.contains('shape') ? 'Shape' :
                    field.classList.contains('line') ? 'Line' :
                        field.classList.contains('label') ? 'Label' : 'Field'}" disabled>
                </div>
                
                ${textProps}
                ${shapeProps}
                ${lineProps}
                
                <div class="input-group">
                    <div class="input-group-sm">
                        <label>Width (px)</label>
                        <input type="number" class="form-control" id="propWidth" 
                               value="${parseInt(style.width)}" min="10">
                    </div>
                    <div class="input-group-sm">
                        <label>Height (px)</label>
                        <input type="number" class="form-control" id="propHeight" 
                               value="${parseInt(style.height)}" min="10">
                    </div>
                </div>
                
                <div class="input-group">
                    <div class="input-group-sm">
                        <label>Left (px)</label>
                        <input type="number" class="form-control" id="propLeft" 
                               value="${parseInt(style.left)}" min="0">
                    </div>
                    <div class="input-group-sm">
                        <label>Top (px)</label>
                        <input type="number" class="form-control" id="propTop" 
                               value="${parseInt(style.top)}" min="0">
                    </div>
                </div>
                
                <div class="form-group">
                    <button class="btn btn-danger" id="deleteField">Delete</button>
                    <button class="btn btn-secondary" id="duplicateField">Duplicate</button>
                </div>
            `;

            this.bindPropertyEvents(field);
        }

        bindPropertyEvents(field) {
            // Text properties
            const propText = document.getElementById('propText');
            if (propText) {
                propText.addEventListener('input', (e) => {
                    field.textContent = e.target.value;
                    this.updateFieldList();
                    this.saveState();
                });
            }

            const propFontSize = document.getElementById('propFontSize');
            if (propFontSize) {
                propFontSize.addEventListener('input', (e) => {
                    field.style.fontSize = e.target.value + 'px';
                    this.saveState();
                });
            }

            const propFontWeight = document.getElementById('propFontWeight');
            if (propFontWeight) {
                propFontWeight.addEventListener('change', (e) => {
                    field.style.fontWeight = e.target.value;
                    this.saveState();
                });
            }

            const propTextDecoration = document.getElementById('propTextDecoration');
            if (propTextDecoration) {
                propTextDecoration.addEventListener('change', (e) => {
                    field.style.textDecoration = e.target.value;
                    this.saveState();
                });
            }

            const propTextColor = document.getElementById('propTextColor');
            if (propTextColor) {
                propTextColor.addEventListener('input', (e) => {
                    field.style.color = e.target.value;
                    this.saveState();
                });
            }

            document.getElementById('alignLeft')?.addEventListener('click', (e) => {
                e.preventDefault();
                field.style.textAlign = 'left';
                document.querySelectorAll('#alignLeft, #alignCenter, #alignRight').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
                this.saveState();
            });

            document.getElementById('alignCenter')?.addEventListener('click', (e) => {
                e.preventDefault();
                field.style.textAlign = 'center';
                document.querySelectorAll('#alignLeft, #alignCenter, #alignRight').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
                this.saveState();
            });

            document.getElementById('alignRight')?.addEventListener('click', (e) => {
                e.preventDefault();
                field.style.textAlign = 'right';
                document.querySelectorAll('#alignLeft, #alignCenter, #alignRight').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
                this.saveState();
            });

            // Shape properties
            const propBorderWidth = document.getElementById('propBorderWidth');
            if (propBorderWidth) {
                propBorderWidth.addEventListener('input', (e) => {
                    field.style.borderWidth = e.target.value + 'px';
                    this.saveState();
                });
            }

            const propBorderColor = document.getElementById('propBorderColor');
            if (propBorderColor) {
                propBorderColor.addEventListener('input', (e) => {
                    field.style.borderColor = e.target.value;
                    this.saveState();
                });
            }

            // Line properties
            const propLineThickness = document.getElementById('propLineThickness');
            if (propLineThickness && field.classList.contains('line')) {
                propLineThickness.addEventListener('input', (e) => {
                    field.style.borderTopWidth = e.target.value + 'px';
                    this.saveState();
                });
            }

            const propLineColor = document.getElementById('propLineColor');
            if (propLineColor && field.classList.contains('line')) {
                propLineColor.addEventListener('input', (e) => {
                    field.style.borderTopColor = e.target.value;
                    field.style.borderTopStyle = 'solid';
                    this.saveState();
                });
            }

            // Dimensions
            const propWidth = document.getElementById('propWidth');
            if (propWidth) {
                propWidth.addEventListener('input', (e) => {
                    field.style.width = e.target.value + 'px';
                    this.saveState();
                });
            }

            const propHeight = document.getElementById('propHeight');
            if (propHeight) {
                propHeight.addEventListener('input', (e) => {
                    field.style.height = e.target.value + 'px';
                    this.saveState();
                });
            }

            // Position
            const propLeft = document.getElementById('propLeft');
            if (propLeft) {
                propLeft.addEventListener('input', (e) => {
                    field.style.left = e.target.value + 'px';
                    this.saveState();
                });
            }

            const propTop = document.getElementById('propTop');
            if (propTop) {
                propTop.addEventListener('input', (e) => {
                    field.style.top = e.target.value + 'px';
                    this.saveState();
                });
            }

            // Actions
            document.getElementById('deleteField').addEventListener('click', () => {
                this.deleteField(field);
            });

            document.getElementById('duplicateField').addEventListener('click', () => {
                this.duplicateField(field);
            });
        }

        hideProperties() {
            const content = document.getElementById('propertiesContent');
            content.innerHTML = '<div class="no-selection">Select a field to edit its properties</div>';
        }

        deleteField(field) {
            if (confirm('Are you sure you want to delete this field?')) {
                field.remove();
                this.selectedField = null;
                this.hideProperties();
                this.updateFieldList();
                this.saveState();
            }
        }

        duplicateField(field) {
            const duplicate = field.cloneNode(true);
            duplicate.classList.remove('selected');

            const oldClass = Array.from(field.classList).find(c => c.startsWith('field-'));
            let baseName = 'duplicate';
            let nextNum = 1;

            if (oldClass) {
                const parts = oldClass.split('-');
                if (parts.length >= 2) {
                    baseName = parts[1];
                }
                nextNum = this.getNextFieldNumber(baseName);
            }

            this.fieldCounter = Math.max(this.fieldCounter, nextNum);

            if (oldClass) {
                duplicate.classList.remove(oldClass);
            }
            duplicate.classList.add(`field-${baseName}-${this.fieldCounter}`);

            const currentLeft = parseInt(duplicate.style.left);
            const currentTop = parseInt(duplicate.style.top);
            duplicate.style.left = (currentLeft) + 'px';
            duplicate.style.top = (currentTop + 15) + 'px';

            document.getElementById('formWrapper').appendChild(duplicate);

            // Setup appropriate events based on field type
            if (duplicate.classList.contains('line')) {
                this.setupLineEvents(duplicate);
            } else if (duplicate.classList.contains('shape')) {
                this.setupShapeEvents(duplicate);
                this.addResizeHandles(duplicate);
            } else {
                this.setupFieldEvents(duplicate);
            }

            this.selectField(duplicate);
            this.updateFieldList();
            this.saveState();
        }

        getNextFieldNumber(baseName) {
            const fields = document.querySelectorAll('.field');
            const existingNumbers = [];

            fields.forEach(field => {
                const classes = Array.from(field.classList);
                classes.forEach(className => {
                    if (className.startsWith(`field-${baseName}-`)) {
                        const num = parseInt(className.split('-').pop());
                        if (!isNaN(num)) existingNumbers.push(num);
                    } else if (className.startsWith(`field-${baseName}`)) {
                        const parts = className.split('-');
                        if (parts.length === 3) {
                            const num = parseInt(parts[2]);
                            if (!isNaN(num)) existingNumbers.push(num);
                        }
                    }
                });
            });

            if (existingNumbers.length === 0) return 1;

            const maxNumber = Math.max(...existingNumbers);
            return maxNumber + 1;
        }

        updateFieldList() {
            const fieldList = document.getElementById('fieldList');
            const fields = document.querySelectorAll('.field');

            fieldList.innerHTML = '';

            fields.forEach((field, index) => {
                const item = document.createElement('div');
                item.className = 'field-item';
                item.textContent = field.textContent || `Field ${index + 1}`;

                if (field === this.selectedField) {
                    item.classList.add('selected');
                }

                item.addEventListener('click', () => {
                    this.selectField(field);
                });

                fieldList.appendChild(item);
            });
        }

        handleKeyboard(e) {
            if (!this.selectedField) return;

            const moveAmount = e.ctrlKey || e.metaKey ? 10 : 1;

            switch (e.key) {
                case 'ArrowUp':
                    e.preventDefault();
                    this.selectedField.style.top = (parseInt(this.selectedField.style.top) - moveAmount) + 'px';
                    this.saveState();
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    this.selectedField.style.top = (parseInt(this.selectedField.style.top) + moveAmount) + 'px';
                    this.saveState();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    this.selectedField.style.left = (parseInt(this.selectedField.style.left) - moveAmount) + 'px';
                    this.saveState();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.selectedField.style.left = (parseInt(this.selectedField.style.left) + moveAmount) + 'px';
                    this.saveState();
                    break;
                case 'Delete':
                    e.preventDefault();
                    this.deleteField(this.selectedField);
                    break;
                case 'Escape':
                    this.selectField(null);
                    break;
            }
        }

        zoom(factor) {
            this.zoomLevel *= factor;
            this.zoomLevel = Math.max(0.1, Math.min(5, this.zoomLevel));

            const formWrapper = document.getElementById('formWrapper');
            formWrapper.style.transform = `scale(${this.zoomLevel})`;
            formWrapper.style.transformOrigin = 'top left';

            document.getElementById('zoomLevel').textContent = Math.round(this.zoomLevel * 100) + '%';
        }

        fitToPage() {
            const container = document.querySelector('.canvas-container');
            const wrapper = document.getElementById('formWrapper');

            const containerWidth = container.clientWidth - 40;
            const containerHeight = container.clientHeight - 40;

            const wrapperWidth = wrapper.offsetWidth;
            const wrapperHeight = wrapper.offsetHeight;

            const scaleX = containerWidth / wrapperWidth;
            const scaleY = containerHeight / wrapperHeight;

            this.zoomLevel = Math.min(scaleX, scaleY);

            wrapper.style.transform = `scale(${this.zoomLevel})`;
            wrapper.style.transformOrigin = 'top left';

            document.getElementById('zoomLevel').textContent = Math.round(this.zoomLevel * 100) + '%';
        }

        updateMousePosition(e) {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = Math.round((e.clientX - rect.left) / this.zoomLevel);
            const y = Math.round((e.clientY - rect.top) / this.zoomLevel);

            this.updatePositionInfo(x, y);
        }

        updatePositionInfo(x, y) {
            document.getElementById('positionInfo').textContent = `Position: ${x}, ${y}`;
        }

        updateStatus(message) {
            document.getElementById('statusText').textContent = message;
            setTimeout(() => {
                document.getElementById('statusText').textContent = 'Ready';
            }, 3000);
        }

        saveState() {
            const state = {
                fields: [],
                canvasSize: {
                    width: document.getElementById('canvasWidth').value,
                    height: document.getElementById('canvasHeight').value
                }
            };

            document.querySelectorAll('.field').forEach(field => {
                const fieldData = {
                    text: field.textContent,
                    className: Array.from(field.classList).find(c => c.startsWith('field-')),
                    style: {
                        left: field.style.left,
                        top: field.style.top,
                        width: field.style.width,
                        height: field.style.height,
                        fontSize: field.style.fontSize,
                        fontFamily: field.style.fontFamily,
                        fontWeight: field.style.fontWeight,
                        textDecoration: field.style.textDecoration,
                        color: field.style.color,
                        backgroundColor: field.style.backgroundColor,
                        borderWidth: field.style.borderWidth,
                        borderStyle: field.style.borderStyle,
                        borderColor: field.style.borderColor,
                        transform: field.style.transform
                    }
                };
                state.fields.push(fieldData);
            });

            this.history = this.history.slice(0, this.historyIndex + 1);
            this.history.push(JSON.stringify(state));
            this.historyIndex++;

            if (this.history.length > 50) {
                this.history.shift();
                this.historyIndex--;
            }
            this.hasUnsavedChanges = true;
        }

        undo() {
            if (this.historyIndex > 0) {
                this.historyIndex--;
                this.restoreState(JSON.parse(this.history[this.historyIndex]));
                this.updateStatus('Undo');
            }
        }

        redo() {
            if (this.historyIndex < this.history.length - 1) {
                this.historyIndex++;
                this.restoreState(JSON.parse(this.history[this.historyIndex]));
                this.updateStatus('Redo');
            }
        }

        restoreState(state) {
            document.querySelectorAll('.field').forEach(field => field.remove());

            document.getElementById('canvasWidth').value = state.canvasSize.width;
            document.getElementById('canvasHeight').value = state.canvasSize.height;
            this.updateCanvasSize();

            state.fields.forEach(fieldData => {
                const field = document.createElement('div');
                field.className = 'field draggable ' + fieldData.className;
                field.textContent = fieldData.text;
                field.contentEditable = true;

                Object.assign(field.style, fieldData.style);

                // Special handling for lines to ensure border properties
                if (fieldData.className.includes('line')) {
                    if (!field.style.borderTop && !field.style.borderTopWidth) {
                        // If no border properties exist, set defaults
                        field.style.borderTop = '1px solid #000';
                        field.style.height = '0px';
                        field.style.backgroundColor = 'transparent';
                    }
                }

                if (fieldData.className.includes('rectangle')) {
                    this.addResizeHandles(field);
                }

                if (fieldData.className.includes('line')) {
                    const startPoint = document.createElement('div');
                    startPoint.className = 'line-endpoint start-point';
                    startPoint.style.display = 'none';

                    const endPoint = document.createElement('div');
                    endPoint.className = 'line-endpoint end-point';
                    endPoint.style.display = 'none';

                    const rotateHandle = document.createElement('div');
                    rotateHandle.className = 'rotate-handle';
                    rotateHandle.style.display = 'none';

                    field.appendChild(startPoint);
                    field.appendChild(endPoint);
                    field.appendChild(rotateHandle);
                }

                document.getElementById('formWrapper').appendChild(field);
                this.setupFieldEvents(field);
            });

            this.selectedField = null;
            this.hideProperties();
            this.updateFieldList();
        }

        rgbToHex(rgb) {
            if (rgb.startsWith('#')) return rgb;

            const match = rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)$/);
            if (!match) return '#000000';

            const r = parseInt(match[1]);
            const g = parseInt(match[2]);
            const b = parseInt(match[3]);

            return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
        }

        selectTextContent(element) {
            const range = document.createRange();
            range.selectNodeContents(element);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
        }

        downloadHtml() {
            const formWrapper = document.getElementById('formWrapper').cloneNode(true);
            const canvasWidth = document.getElementById('canvasWidth').value;
            const canvasHeight = document.getElementById('canvasHeight').value;

            // Remove editor-specific elements
            formWrapper.querySelectorAll('.rulers, .guideline').forEach(el => el.remove());
            formWrapper.querySelectorAll('.resize-handle, .line-endpoint, .rotate-handle').forEach(el => el.remove());
            formWrapper.classList.remove('grid-bg');

            // Process all fields for clean output
            const cssLines = [];
            const usedClasses = new Set();

            formWrapper.querySelectorAll('.field').forEach(field => {
                // Remove editor-specific classes and attributes
                field.classList.remove('selected', 'dragging', 'draggable');
                field.removeAttribute('contenteditable');

                // Get the field's class name
                let className = Array.from(field.classList).find(c => c.startsWith('field-'));
                if (!className) {
                    className = `field-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
                    field.classList.add(className);
                }

                // Skip if we've already processed this class
                if (usedClasses.has(className)) return;
                usedClasses.add(className);

                // Build CSS rules from inline styles
                const style = field.style;
                const styleRules = [];

                // Common properties
                if (style.top) styleRules.push(`top: ${style.top}`);
                if (style.left) styleRules.push(`left: ${style.left}`);
                if (style.width) styleRules.push(`width: ${style.width}`);
                if (style.height) styleRules.push(`height: ${style.height}`);

                // Special handling for lines
                if (field.classList.contains('line')) {
                    if (style.borderTop) {
                        styleRules.push(`border-top: ${style.borderTop}`);
                    } else {
                        // Default line style if none specified
                        styleRules.push('border-top: 1px solid #000');
                    }
                    styleRules.push('height: 0');
                    styleRules.push('background-color: transparent');
                    // Preserve transform and transform-origin for rotated lines
                    if (style.transform) {
                        styleRules.push(`transform: ${style.transform}`);
                        styleRules.push(`transform-origin: ${style.transformOrigin || '0 0'}`);
                    }
                } else {
                    // Regular field styles
                    styleRules.push(`font-size: ${style.fontSize || '10px'}`);
                    styleRules.push(`text-align: ${style.textAlign || 'left'}`);
                    if (style.fontSize) styleRules.push(`font-size: ${style.fontSize}`);
                    if (style.fontWeight) styleRules.push(`font-weight: ${style.fontWeight}`);
                    if (style.textDecoration) styleRules.push(`text-decoration: ${style.textDecoration}`);
                    if (style.color) styleRules.push(`color: ${style.color}`);
                    if (style.backgroundColor) styleRules.push(`background-color: ${style.backgroundColor}`);
                    if (style.border) styleRules.push(`border: ${style.border}`);
                }

                // Add position absolute (required for proper rendering)
                styleRules.push('position: absolute;');

                // Add to CSS lines if we have any rules
                if (styleRules.length > 0) {
                    cssLines.push(`.${className} { ${styleRules.join('; ')} }`);
                }

                // Clear inline styles (they'll be in the stylesheet)
                field.removeAttribute('style');
            });

            const htmlContent = `<!DOCTYPE html>
                                <html lang="en">
                                    <head>
                                        <meta charset="UTF-8">
                                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                        <title>Generated Template</title>
                                        <style>
                                            body {
                                                margin: 0;
                                                padding: 0;
                                                font-family: Arial, sans-serif;
                                            }

                                            .form-wrapper {
                                                position: relative;
                                                width: ${canvasWidth}in;
                                                height: ${canvasHeight}in;
                                                border: 1px solid #000;
                                                margin: 0 auto;
                                                background: white;
                                            }

                                            ${cssLines.join('\n')}

                                            @media print {
                                                @page {
                                                    size: ${canvasWidth}in ${canvasHeight}in;
                                                    margin: 0;
                                                }

                                                body {
                                                    margin: 0;
                                                    padding: 0;
                                                }

                                                .form-wrapper {
                                                    border: none;
                                                    margin: 0;
                                                }
                                            }
                                        </style>
                                    </head>
                                    <body>
                                        ${formWrapper.outerHTML}
                                    </body>
                                </html>`;

            const blob = new Blob([htmlContent], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'template.html';
            a.click();
            URL.revokeObjectURL(url);

            this.updateStatus('HTML template downloaded');
            this.resetUnsavedChanges();
        }

        downloadPdf() {
            const originalWrapper = document.getElementById('formWrapper');
            const formWrapper = originalWrapper.cloneNode(true);

            // Preserve 'hide-labels' class
            if (originalWrapper.classList.contains('hide-labels')) {
                formWrapper.classList.add('hide-labels');
            }

            // Remove editor-specific elements
            formWrapper.querySelectorAll('.rulers, .guideline').forEach(el => el.remove());
            formWrapper.querySelectorAll('.resize-handle, .line-endpoint, .rotate-handle').forEach(el => {
                el.style.display = 'none';
            });

            formWrapper.classList.remove('grid-bg');

            // Clean up field classes and styles
            formWrapper.querySelectorAll('.field').forEach(field => {
                field.classList.remove('selected', 'dragging');
                field.contentEditable = false;

                // Special handling for lines
                if (field.classList.contains('line')) {
                    if (!field.style.borderTop && !field.style.borderTopWidth) {
                        // Default line style if none specified
                        field.style.borderTop = '1px solid #000';
                        field.style.height = '0';
                        field.style.backgroundColor = 'transparent';
                    }
                } else {
                    // Regular fields
                    field.style.border = field.style.borderStyle === 'none' ? 'none' : field.style.border;
                }
            });

            const canvasWidth = document.getElementById('canvasWidth').value;
            const canvasHeight = document.getElementById('canvasHeight').value;

            const htmlContent = `<!DOCTYPE html>
                        <html lang="en">
                            <head>
                                <meta charset="UTF-8">
                                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                <title>PDF Export</title>
                                <style>
                                    body {
                                        margin: 0;
                                        padding: 0;
                                        font-family: Arial, sans-serif;
                                    }

                                    .form-wrapper {
                                        position: relative;
                                        width: ${canvasWidth}in;
                                        height: ${canvasHeight}in;
                                        margin: 0;
                                        background: white;
                                    }

                                    .field {
                                        position: absolute;
                                        font-weight: normal;
                                        padding: 0px;
                                        font-size: 10px;
                                    }

                                    .hide-labels .label {
                                        display: none !important;
                                    }

                                    @media print {
                                        @page {
                                            size: ${canvasWidth}in ${canvasHeight}in;
                                            margin: 0;
                                        }

                                        body {
                                            margin: 0;
                                            padding: 0;
                                        }

                                        .form-wrapper {
                                            border: none;
                                            margin: 0;
                                        }
                                    }
                                </style>
                            </head>
                            <body>
                                ${formWrapper.outerHTML}
                            </body>
                        </html>`;

            const printWindow = window.open('', '_blank');
            printWindow.document.write(htmlContent);
            printWindow.document.close();

            printWindow.onload = function () {
                printWindow.focus();
                printWindow.print();
                printWindow.close();
            };

            this.updateStatus('PDF download initiated');
        }


        loadHtmlTemplate(event) {
            const file = event.target.files[0];
            if (!file) return;

            if (!confirm("This will override the current layout. Continue?")) {
                event.target.value = "";
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                const parser = new DOMParser();
                const doc = parser.parseFromString(e.target.result, 'text/html');
                const importedWrapper = doc.querySelector('.form-wrapper');

                if (!importedWrapper) {
                    alert("Invalid template. No .form-wrapper found.");
                    return;
                }

                // Clean up the imported template
                const container = document.querySelector('.canvas-container');
                const oldWrapper = document.getElementById('formWrapper');
                if (oldWrapper) oldWrapper.remove();

                importedWrapper.id = 'formWrapper';
                container.insertBefore(importedWrapper, container.querySelector('.zoom-controls'));

                // First collect all style rules from the document
                const styleRules = {};
                try {
                    // Parse style tags
                    doc.querySelectorAll('style').forEach(styleTag => {
                        const css = styleTag.textContent;
                        // Match CSS rules for field classes
                        const ruleMatches = css.matchAll(/\.(field-[^\s{]+)\s*{([^}]+)}/g);
                        for (const match of ruleMatches) {
                            const className = match[1].trim();
                            styleRules[className] = match[2].trim();
                        }
                    });
                } catch (e) {
                    console.error("Error parsing styles:", e);
                }

                // Process all fields - apply ONLY stylesheet styles
                importedWrapper.querySelectorAll('.field').forEach(field => {
                    // Find all field-related classes
                    const fieldClasses = Array.from(field.classList).filter(c => c.startsWith('field-'));
                    if (fieldClasses.length === 0) return;

                    // Clear all inline styles except contentEditable
                    const wasEditable = field.contentEditable === 'true';
                    field.removeAttribute('style');
                    field.contentEditable = wasEditable;

                    // Apply styles from all matching class rules
                    fieldClasses.forEach(className => {
                        if (styleRules[className]) {
                            const declarations = styleRules[className].split(';');
                            declarations.forEach(declaration => {
                                const [prop, value] = declaration.split(':').map(p => p.trim());
                                if (prop && value) {
                                    // Convert CSS property names to JS style names
                                    const jsProp = prop.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
                                    field.style[jsProp] = value;
                                }
                            });
                        }
                    });

                    // Special handling for lines
                    if (field.classList.contains('line')) {
                        if (!field.style.borderTop && !field.style.borderTopWidth) {
                            // Default line styling if no border properties exist
                            field.style.borderTop = '1px solid #000';
                            field.style.height = '0';
                            field.style.backgroundColor = 'transparent';
                        }
                    }

                    // Special handling for rectangle shapes
                    if (field.classList.contains('rectangle') &&
                        !field.style.border &&
                        !field.style.borderWidth &&
                        !field.style.borderColor) {
                        // Apply default rectangle styling if no border properties exist
                        field.style.border = '1px solid #000';
                        field.style.backgroundColor = 'transparent';
                    }

                    // Force these editor-required styles if not set
                    if (!field.style.position) {
                        field.style.position = 'absolute';
                    }

                    // Setup editor functionality
                    this.setupFieldEvents(field);

                    if (field.classList.contains('rectangle')) {
                        this.addResizeHandles(field);
                    }

                    if (field.classList.contains('line')) {
                        const startPoint = document.createElement('div');
                        startPoint.className = 'line-endpoint start-point';
                        startPoint.style.display = 'none';

                        const endPoint = document.createElement('div');
                        endPoint.className = 'line-endpoint end-point';
                        endPoint.style.display = 'none';

                        const rotateHandle = document.createElement('div');
                        rotateHandle.className = 'rotate-handle';
                        rotateHandle.style.display = 'none';

                        field.appendChild(startPoint);
                        field.appendChild(endPoint);
                        field.appendChild(rotateHandle);
                    }
                });

                // Update canvas size
                const style = window.getComputedStyle(importedWrapper);
                const widthInInches = parseFloat(style.width) / 96;
                const heightInInches = parseFloat(style.height) / 96;

                document.getElementById('canvasWidth').value = widthInInches.toFixed(2);
                document.getElementById('canvasHeight').value = heightInInches.toFixed(2);
                this.updateCanvasSize();

                this.selectField(null);
                this.updateFieldList();
                this.saveState();
                this.updateStatus("Template imported successfully");
                this.resetUnsavedChanges();
            };

            reader.readAsText(file);
        }
    }

    // Initialize the designer
    const designer = new TemplateDesigner();
});