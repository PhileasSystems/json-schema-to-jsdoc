const fs = require('fs');
const json = require('json-pointer');

module.exports = generate;

function generate(schema, options = {}) {
  let jsdoc = '';

  if (!schema || Object.keys(schema).length === 0) {
    return jsdoc;
  }

  jsdoc += '/**\n';
  jsdoc += writeDescription(schema);

  if (!json.has(schema, '/properties')){
    return jsdoc;
  }

  jsdoc += processProperties(schema, false, options);

  jsdoc += '  */\n';

  return jsdoc;
}

function processProperties(schema, parentPropertyPath = false, options = {}) {
  const props = json.get(schema, '/properties');
  const required = json.has(schema, '/required') ? json.get(schema, '/required') : [];

  let text = '';
  for (let property in props) {
    if (Array.isArray(options.ignore) && options.ignore.includes(property)) {
      continue;
    } else {
      const propertyPath = [parentPropertyPath, property].filter(e => e).join('.');
      const optional = !required.includes(property);

      if (props[property].type === 'object' && props[property].properties) {
        text += writeParam('object', propertyPath, props[property].description, optional);
        text += processProperties(props[property], propertyPath);
      } else {
        const type = getType(props[property]) || upperFirst(property);
        text += writeParam(type, propertyPath, props[property].description, optional);
      }
    } 
  }
  return text;
}

function writeDescription(schema, suffix = 'object') {
  let text = schema.description || `Represents a ${schema.id} ${suffix}`;
  text += `\n  * @name ${upperFirst(schema.id)}`;
  return `  * ${text}\n  *\n`;
}

function writeParam(type = '', field, description = '', optional) {
  const fieldTemplate = optional ? `[${field}]` : field;
  return `  * @property {${type}} ${[fieldTemplate, description].filter(e => e != '').join(' - ')}\n`;
}

function getType(schema) {
  if (schema.$ref) {
    const ref = json.get(root, schema.$ref.substr(1));
    return getType(ref);
  }

  if (schema.enum) {
    return 'enum';
  } 

  if (Array.isArray(schema.type)) {
    if (schema.type.includes('null')) {
      return `?${schema.type[0]}`;
    } else {
      return schema.type.join('|');
    }
  }

  return schema.type;
}

function upperFirst(str = '') {
  return str.substr(0,1).toUpperCase() + str.substr(1);
}